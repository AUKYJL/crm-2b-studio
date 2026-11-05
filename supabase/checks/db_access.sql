-- Run with psql -X -v ON_ERROR_STOP=1 -f supabase/checks/db_access.sql
-- Use an empty local database with both migrations applied and connect as postgres.
begin;

create function pg_temp.fixture_id(n integer) returns uuid
language sql immutable
as $$ select ('abc00000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid $$;

create function pg_temp.assert_ok(ok boolean, label text) returns void
language plpgsql
as $$
begin
  if ok is distinct from true then
    raise exception 'Access check failed: %', label;
  end if;
end;
$$;

insert into auth.users (id)
select pg_temp.fixture_id(n) from generate_series(1, 7) as n;

insert into public.profiles (id, full_name, role)
select pg_temp.fixture_id(n), 'Fixture ' || n, role::public.user_role
from (values (1, 'manager'), (2, 'executor'), (3, 'executor'),
  (4, 'manager'), (5, 'executor'), (6, 'executor')) as p(n, role);

insert into public.objects (id, name, address, deleted_at)
select pg_temp.fixture_id(n), 'Object ' || n, '', deleted_at
from (values (11, null::timestamptz), (12, null), (13, null), (14, now()), (15, null))
  as o(n, deleted_at);

insert into public.tasks (id, object_id, title, assignee_id, author_id, deleted_at)
select pg_temp.fixture_id(n), pg_temp.fixture_id(object_n), 'Task ' || n,
  pg_temp.fixture_id(assignee_n), pg_temp.fixture_id(author_n), deleted_at
from (values (21, 11, 2, 1, null::timestamptz), (22, 11, 3, 4, null),
  (23, 12, 3, 4, null), (24, 13, 2, 4, now()), (25, 14, 2, 4, null))
  as t(n, object_n, assignee_n, author_n, deleted_at);

insert into public.task_events (id, task_id, actor_id, type, to_status)
select pg_temp.fixture_id(n + 10), pg_temp.fixture_id(n), pg_temp.fixture_id(actor_n),
  'created', 'new'
from (values (21, 1), (22, 4), (23, 4), (24, 4), (25, 4)) as e(n, actor_n);

insert into public.task_events (id, task_id, actor_id, type, old_assignee_id, new_assignee_id)
values (pg_temp.fixture_id(36), pg_temp.fixture_id(21), pg_temp.fixture_id(4),
  'assignee_changed', pg_temp.fixture_id(5), pg_temp.fixture_id(2));

select pg_temp.assert_ok(
  bool_and(c.relrowsecurity), 'RLS enabled on business tables'
)
from pg_catalog.pg_class as c
where c.oid in ('public.profiles'::regclass, 'public.objects'::regclass,
  'public.tasks'::regclass, 'public.task_events'::regclass);

select pg_temp.assert_ok(
  bool_and(
    not has_any_column_privilege('anon', relation, 'SELECT')
    and has_table_privilege('authenticated', relation, 'SELECT')
    and not has_any_column_privilege(role_name, relation, 'INSERT, UPDATE')
    and not has_table_privilege(role_name, relation, 'DELETE, TRUNCATE')
  ), 'read grants and no write grants'
)
from (values ('public.profiles'), ('public.objects'), ('public.tasks'),
  ('public.task_events'), ('public.profile_names')) as relations(relation)
cross join (values ('anon'), ('authenticated')) as roles(role_name);

select pg_temp.assert_ok(
  not has_schema_privilege('anon', 'private', 'USAGE')
  and not has_schema_privilege('authenticated', 'private', 'USAGE')
  and bool_and(
    p.prosecdef
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and not has_function_privilege('anon', p.oid, 'EXECUTE')
  ), 'helpers are usable through policies and the view only'
)
from pg_catalog.pg_proc as p
where p.oid in ('private.current_user_role()'::regprocedure,
  'private.executor_tasks()'::regprocedure,
  'private.executor_task_participant_names()'::regprocedure);

set local role anon;
do $$
begin
  perform 1 from public.tasks;
  raise exception 'anon read succeeded';
exception when insufficient_privilege then
  null;
end;
$$;
reset role;

set local role authenticated;
-- Manager sees all history, including events on archived tasks.
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.fixture_id(1))::text, true);
select pg_temp.assert_ok((select count(*) = 6 from public.profiles), 'manager profiles');
select pg_temp.assert_ok((select count(*) = 4 from public.objects), 'manager active objects');
select pg_temp.assert_ok((select count(*) = 3 from public.tasks), 'manager active tasks');
select pg_temp.assert_ok((select count(*) = 6 from public.task_events), 'manager history');

-- A client-controlled claim cannot elevate an executor to manager.
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.fixture_id(2),
  'user_metadata', json_build_object('role', 'manager'))::text, true);
select pg_temp.assert_ok(
  (select array_agg(id) = array[pg_temp.fixture_id(2)] from public.profiles), 'executor own profile'
);
select pg_temp.assert_ok(
  (select array_agg(id order by id) = array[
    pg_temp.fixture_id(1), pg_temp.fixture_id(2), pg_temp.fixture_id(4), pg_temp.fixture_id(5)
  ] from public.profile_names), 'executor author, history participants and own name'
);
select pg_temp.assert_ok(
  (select array_agg(id) = array[pg_temp.fixture_id(11)] from public.objects), 'executor objects'
);
select pg_temp.assert_ok(
  (select array_agg(id) = array[pg_temp.fixture_id(21)] from public.tasks), 'executor tasks'
);
select pg_temp.assert_ok(
  (select array_agg(id order by id) = array[pg_temp.fixture_id(31), pg_temp.fixture_id(36)]
    from public.task_events), 'executor history'
);
do $$
begin
  update public.profiles set role = 'manager' where id = auth.uid();
  raise exception 'profile role update succeeded';
exception when insufficient_privilege then
  null;
end;
$$;

-- An authenticated identity without a provisioned profile has no business access.
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.fixture_id(7))::text, true);
select pg_temp.assert_ok(
  not exists (select from public.profiles)
  and not exists (select from public.profile_names)
  and not exists (select from public.objects)
  and not exists (select from public.tasks)
  and not exists (select from public.task_events), 'unprovisioned identity'
);

reset role;
-- Simulate a trusted reassignment before RPCs are introduced in step 03.
update public.tasks set assignee_id = pg_temp.fixture_id(3) where id = pg_temp.fixture_id(21);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.fixture_id(2))::text, true);
select pg_temp.assert_ok(
  not exists (select from public.objects)
  and not exists (select from public.tasks)
  and not exists (select from public.task_events)
  and (select array_agg(id) = array[pg_temp.fixture_id(2)] from public.profile_names),
  'former executor loses access'
);
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.fixture_id(3))::text, true);
select pg_temp.assert_ok(
  exists (select from public.tasks where id = pg_temp.fixture_id(21))
  and exists (select from public.task_events where task_id = pg_temp.fixture_id(21)),
  'new executor gains access'
);

rollback;
