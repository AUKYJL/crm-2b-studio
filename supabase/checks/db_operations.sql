-- Run with psql -X -v ON_ERROR_STOP=1 -f supabase/checks/db_operations.sql
-- Use a local database with the migrations applied and connect as postgres.
begin;

create function pg_temp.assert_ok(ok boolean, label text) returns void
language plpgsql
as $$
begin
  if ok is distinct from true then
    raise exception 'Operation check failed: %', label;
  end if;
end;
$$;

create function pg_temp.expect_error(statement text, expected_code text) returns void
language plpgsql
as $$
begin
  execute statement;
  raise exception 'Expected SQLSTATE %: %', expected_code, statement;
exception when others then
  if sqlstate <> expected_code then
    raise;
  end if;
end;
$$;

select pg_temp.assert_ok(
  count(*) = 8 and bool_and(
    not p.prosecdef
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and not has_function_privilege('anon', p.oid, 'EXECUTE')
    and not has_function_privilege('service_role', p.oid, 'EXECUTE')
    and not exists (
      select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as acl
      where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
    )
  ), 'public RPC permissions'
)
from pg_proc as p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('create_object', 'update_object', 'archive_object', 'create_task',
    'update_task', 'archive_task', 'reassign_task', 'transition_task');

select pg_temp.assert_ok(
  count(*) = 3 and bool_and(not has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'internal helpers have no client execute grant'
)
from pg_proc as p
where p.pronamespace = 'private'::regnamespace
  and p.proname in ('require_manager', 'lock_active_object', 'lock_active_task');

\set manager 'abc10000-0000-0000-0000-000000000001'
\set executor 'abc10000-0000-0000-0000-000000000002'
\set next_executor 'abc10000-0000-0000-0000-000000000003'
\set reviewer 'abc10000-0000-0000-0000-000000000004'
\set no_profile 'abc10000-0000-0000-0000-000000000005'
insert into auth.users (id) values (:'manager'), (:'executor'), (:'next_executor'),
  (:'reviewer'), (:'no_profile');
insert into public.profiles (id, full_name, role)
values (:'manager', 'Manager', 'manager'), (:'executor', 'Executor', 'executor'),
  (:'next_executor', 'Next executor', 'executor'), (:'reviewer', 'Reviewer', 'manager');

set local role anon;
select pg_temp.expect_error($q$select public.create_object('Forbidden', '')$q$, '42501');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'no_profile')::text, true);
select pg_temp.expect_error($q$select public.create_object('Forbidden', '')$q$, '42501');

select set_config('request.jwt.claims', json_build_object('sub', :'manager')::text, true);
select id as source_id from public.create_object('Source', '') \gset
select id as object_id from public.create_object('Object', '') \gset
select pg_temp.assert_ok(name = 'Updated', 'manager updates object')
from public.update_object(:'object_id', 'Updated', 'Address');
select pg_temp.expect_error(
  format('select public.create_task(%L, %L, %L, %L)', :'object_id', 'Invalid', '', :'manager'),
  '22023'
);
select id as task_id from public.create_task(:'source_id', 'Task', '', :'executor') \gset
select pg_temp.assert_ok(object_id = :'object_id' and title = 'Moved' and status = 'new'
  and author_id = :'manager' and assignee_id = :'executor', 'task move preserves identity and status')
from public.update_task(:'task_id', :'object_id', 'Moved', 'Details');
select pg_temp.expect_error($q$update public.tasks set status = 'accepted'$q$, '42501');
select pg_temp.expect_error($q$delete from public.task_events$q$, '42501');
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L)', :'task_id', 'new', 'in_progress'), '22023'
);

select set_config('request.jwt.claims', json_build_object('sub', :'next_executor',
  'user_metadata', json_build_object('role', 'manager'))::text, true);
select pg_temp.expect_error($q$select public.create_object('Forbidden', '')$q$, '42501');
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L)', :'task_id', 'new', 'in_progress'), 'PT404'
);
select set_config('request.jwt.claims', json_build_object('sub', :'executor')::text, true);
select pg_temp.assert_ok(status = 'in_progress', 'executor starts task')
from public.transition_task(:'task_id', 'new', 'in_progress');
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L)', :'task_id', 'new', 'in_progress'), 'PT409'
);
select pg_temp.assert_ok(status = 'in_review', 'executor submits task')
from public.transition_task(:'task_id', 'in_progress', 'in_review');
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L)', :'task_id', 'in_review', 'accepted'), '22023'
);

select set_config('request.jwt.claims', json_build_object('sub', :'reviewer')::text, true);
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L, %L)', :'task_id', 'in_review', 'rework', E' \t\n'),
  '22023'
);

reset role;
create function pg_temp.reject_event() returns trigger
language plpgsql
as $$ begin raise exception using errcode = '23514', message = 'Forced event failure'; end; $$;
create trigger check_event_rollback before insert on public.task_events
for each row when (new.comment = 'Reject event') execute function pg_temp.reject_event();

set local role authenticated;
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L, %L)', :'task_id', 'in_review', 'rework', 'Reject event'),
  '23514'
);
select pg_temp.assert_ok(status = 'in_review', 'event failure rolls back task status')
from public.tasks where id = :'task_id';

select pg_temp.assert_ok(status = 'rework', 'manager returns task with comment')
from public.transition_task(:'task_id', 'in_review', 'rework', 'Fix');
select pg_temp.assert_ok(status = 'rework' and assignee_id = :'next_executor', 'reassign preserves status')
from public.reassign_task(:'task_id', :'executor', :'next_executor');
select pg_temp.expect_error(
  format('select public.reassign_task(%L, %L, %L)', :'task_id', :'executor', :'next_executor'), 'PT409'
);

select set_config('request.jwt.claims', json_build_object('sub', :'executor')::text, true);
select pg_temp.assert_ok(not exists (select 1 from public.task_events where task_id = :'task_id'),
  'previous assignee loses history');
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L)', :'task_id', 'rework', 'in_progress'), 'PT404'
);
select set_config('request.jwt.claims', json_build_object('sub', :'next_executor')::text, true);
select pg_temp.assert_ok(status = 'in_progress', 'new executor resumes task')
from public.transition_task(:'task_id', 'rework', 'in_progress');
select pg_temp.assert_ok(status = 'in_review', 'new executor resubmits task')
from public.transition_task(:'task_id', 'in_progress', 'in_review');

select set_config('request.jwt.claims', json_build_object('sub', :'reviewer')::text, true);
select pg_temp.assert_ok(status = 'accepted', 'manager accepts task authored by another manager')
from public.transition_task(:'task_id', 'in_review', 'accepted');
select pg_temp.expect_error(
  format('select public.reassign_task(%L, %L, %L)', :'task_id', :'next_executor', :'executor'), 'PT409'
);
select pg_temp.expect_error(
  format('select public.transition_task(%L, %L, %L, %L)', :'task_id', 'accepted', 'rework', 'Fix'),
  '22023'
);
select pg_temp.assert_ok(title = 'Corrected' and status = 'accepted', 'manager edits accepted task text')
from public.update_task(:'task_id', :'object_id', 'Corrected', 'Details');
select id as archived_task_id from public.create_task(:'object_id', 'Archive separately', '', :'executor') \gset
select deleted_at as task_deleted_at from public.archive_task(:'archived_task_id') \gset
select deleted_at as object_deleted_at from public.archive_object(:'object_id') \gset
select pg_temp.assert_ok(not exists (select 1 from public.tasks where object_id = :'object_id'),
  'archive hides tasks');
select pg_temp.expect_error(
  format('select public.create_task(%L, %L, %L, %L)', :'object_id', 'Invalid', '', :'executor'), 'PT404'
);
select pg_temp.assert_ok(
  count(*) = 8
  and count(*) filter (where type = 'created' and actor_id = :'manager' and to_status = 'new') = 1
  and count(*) filter (where type = 'status_changed' and actor_id = :'reviewer'
    and from_status = 'in_review' and to_status = 'rework' and comment = 'Fix') = 1
  and count(*) filter (where type = 'assignee_changed' and actor_id = :'reviewer'
    and old_assignee_id = :'executor' and new_assignee_id = :'next_executor') = 1,
  'server-authored events survive archive and failed operations add no events'
)
from public.task_events where task_id = :'task_id';

reset role;
select pg_temp.assert_ok(deleted_at = :'object_deleted_at', 'object archive marks active task')
from public.tasks where id = :'task_id';
select pg_temp.assert_ok(deleted_at = :'task_deleted_at', 'object archive preserves earlier archive time')
from public.tasks where id = :'archived_task_id';

rollback;
