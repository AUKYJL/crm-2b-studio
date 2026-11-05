begin;

create schema private;
revoke all on schema private from public, anon, authenticated;

create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid());
$$;

-- Read assignment without entering the tasks policy from the objects policy.
create function private.executor_tasks()
returns table (task_id uuid, object_id uuid, author_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.object_id, t.author_id
  from public.tasks as t
  join public.objects as o on o.id = t.object_id
  where (select private.current_user_role()) = 'executor'
    and t.assignee_id = (select auth.uid())
    and t.deleted_at is null
    and o.deleted_at is null;
$$;

-- Only names and IDs cross the profile boundary for task participants.
create function private.executor_task_participant_names()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with assigned_tasks as (
    select * from private.executor_tasks()
  ),
  participants as (
    select t.author_id as id from assigned_tasks as t
    union all
    select participant.id
    from assigned_tasks as t
    join public.task_events as e on e.task_id = t.task_id
    cross join lateral (
      values (e.actor_id), (e.old_assignee_id), (e.new_assignee_id)
    ) as participant(id)
  )
  select p.id, p.full_name
  from public.profiles as p
  where p.id in (select participant.id from participants as participant);
$$;

revoke all on function private.current_user_role(), private.executor_tasks(),
  private.executor_task_participant_names() from public, anon, authenticated, service_role;
grant execute on function private.current_user_role(), private.executor_tasks(),
  private.executor_task_participant_names() to authenticated;

create policy profiles_read on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.current_user_role()) = 'manager'
  );

create policy objects_read on public.objects
  for select to authenticated
  using (
    deleted_at is null
    and (
      (select private.current_user_role()) = 'manager'
      or id in (select t.object_id from private.executor_tasks() as t)
    )
  );

create policy tasks_read on public.tasks
  for select to authenticated
  using (
    deleted_at is null
    and (
      (select private.current_user_role()) = 'manager'
      or (
        (select private.current_user_role()) = 'executor'
        and assignee_id = (select auth.uid())
      )
    )
    and exists (
      select 1 from public.objects as o where o.id = tasks.object_id
    )
  );

create policy task_events_read on public.task_events
  for select to authenticated
  using (
    (select private.current_user_role()) = 'manager'
    or exists (
      select 1 from public.tasks as t where t.id = task_events.task_id
    )
  );

create view public.profile_names with (security_invoker = true) as
  select p.id, p.full_name from public.profiles as p
  union
  select p.id, p.full_name from private.executor_task_participant_names() as p;

revoke all on table public.profile_names from public, anon, authenticated;

grant select on table public.profiles, public.objects, public.tasks, public.task_events,
  public.profile_names to authenticated;

commit;
