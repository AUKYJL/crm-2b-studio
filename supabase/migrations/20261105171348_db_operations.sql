begin;

create function private.require_manager()
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  if private.current_user_role() is distinct from 'manager' then
    raise exception using errcode = '42501', message = 'Manager role required';
  end if;

  return auth.uid();
end;
$$;

-- Serialize task creation and moves into an object against its archival.
create function private.lock_active_object(p_object_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.objects
  where id = p_object_id and deleted_at is null
  for share;

  if not found then
    raise exception using errcode = 'PT404', message = 'Active object not found';
  end if;
end;
$$;

create function private.lock_active_task(p_task_id uuid)
returns public.tasks
language plpgsql
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  select t.* into v_task
  from public.tasks as t
  where t.id = p_task_id
    and t.deleted_at is null
    and (private.current_user_role() = 'manager' or t.assignee_id = auth.uid())
    and exists (
      select 1 from public.objects as o
      where o.id = t.object_id and o.deleted_at is null
    )
  for update of t;

  if not found then
    raise exception using errcode = 'PT404', message = 'Active task not found';
  end if;

  return v_task;
end;
$$;

create function private.create_object(p_name text, p_address text)
returns public.objects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object public.objects;
begin
  perform private.require_manager();

  insert into public.objects (name, address)
  values (p_name, p_address)
  returning * into v_object;

  return v_object;
end;
$$;

create function private.update_object(p_object_id uuid, p_name text, p_address text)
returns public.objects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object public.objects;
begin
  perform private.require_manager();

  update public.objects
  set name = p_name, address = p_address, updated_at = pg_catalog.clock_timestamp()
  where id = p_object_id and deleted_at is null
  returning * into v_object;

  if not found then
    raise exception using errcode = 'PT404', message = 'Active object not found';
  end if;

  return v_object;
end;
$$;

create function private.archive_object(p_object_id uuid)
returns public.objects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object public.objects;
  v_archived_at timestamptz;
begin
  perform private.require_manager();

  -- Lock the object before its tasks, matching create_task and update_task.
  perform 1 from public.objects
  where id = p_object_id and deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'PT404', message = 'Active object not found';
  end if;

  perform 1 from public.tasks
  where object_id = p_object_id and deleted_at is null
  order by id
  for update;

  v_archived_at := pg_catalog.clock_timestamp();

  update public.tasks
  set deleted_at = v_archived_at, updated_at = v_archived_at
  where object_id = p_object_id and deleted_at is null;

  update public.objects
  set deleted_at = v_archived_at, updated_at = v_archived_at
  where id = p_object_id
  returning * into v_object;

  return v_object;
end;
$$;

create function private.create_task(
  p_object_id uuid, p_title text, p_description text, p_assignee_id uuid
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := private.require_manager();
  v_task public.tasks;
begin
  perform private.lock_active_object(p_object_id);

  perform 1 from public.profiles
  where id = p_assignee_id and role = 'executor'
  for share;

  if not found then
    raise exception using errcode = '22023', message = 'Assignee must be an executor';
  end if;

  insert into public.tasks (object_id, title, description, assignee_id, author_id, status)
  values (p_object_id, p_title, p_description, p_assignee_id, v_actor_id, 'new')
  returning * into v_task;

  insert into public.task_events (task_id, actor_id, type, to_status)
  values (v_task.id, v_actor_id, 'created', v_task.status);

  return v_task;
end;
$$;

create function private.update_task(
  p_task_id uuid, p_object_id uuid, p_title text, p_description text
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  perform private.require_manager();
  perform private.lock_active_object(p_object_id);
  perform private.lock_active_task(p_task_id);

  update public.tasks
  set object_id = p_object_id, title = p_title, description = p_description,
    updated_at = pg_catalog.clock_timestamp()
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

create function private.archive_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
  v_archived_at timestamptz;
begin
  perform private.require_manager();
  perform private.lock_active_task(p_task_id);
  v_archived_at := pg_catalog.clock_timestamp();

  update public.tasks
  set deleted_at = v_archived_at, updated_at = v_archived_at
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

create function private.reassign_task(
  p_task_id uuid, p_expected_assignee_id uuid, p_assignee_id uuid
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := private.require_manager();
  v_task public.tasks;
  v_old_assignee_id uuid;
begin
  v_task := private.lock_active_task(p_task_id);
  v_old_assignee_id := v_task.assignee_id;

  if v_task.status = 'accepted' then
    raise exception using errcode = 'PT409', message = 'Accepted tasks cannot be reassigned';
  end if;

  if v_old_assignee_id is distinct from p_expected_assignee_id then
    raise exception using errcode = 'PT409', message = 'Task assignee has changed';
  end if;

  if v_old_assignee_id = p_assignee_id then
    raise exception using errcode = '22023', message = 'New assignee must differ from current assignee';
  end if;

  perform 1 from public.profiles
  where id = p_assignee_id and role = 'executor'
  for share;

  if not found then
    raise exception using errcode = '22023', message = 'Assignee must be an executor';
  end if;

  update public.tasks
  set assignee_id = p_assignee_id, updated_at = pg_catalog.clock_timestamp()
  where id = p_task_id
  returning * into v_task;

  insert into public.task_events (task_id, actor_id, type, old_assignee_id, new_assignee_id, created_at)
  values (p_task_id, v_actor_id, 'assignee_changed', v_old_assignee_id, p_assignee_id, v_task.updated_at);

  return v_task;
end;
$$;

create function private.transition_task(
  p_task_id uuid, p_expected_status public.task_status, p_to_status public.task_status,
  p_comment text
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role public.user_role := private.current_user_role();
  v_task public.tasks;
  v_from_status public.task_status;
begin
  if v_role is null then
    raise exception using errcode = '42501', message = 'User profile required';
  end if;

  v_task := private.lock_active_task(p_task_id);
  v_from_status := v_task.status;

  if v_from_status is distinct from p_expected_status then
    raise exception using errcode = 'PT409', message = 'Task status has changed';
  end if;

  if (case v_role
    when 'executor' then
      v_task.assignee_id = v_actor_id
      and (
        (v_from_status in ('new', 'rework') and p_to_status = 'in_progress')
        or (v_from_status = 'in_progress' and p_to_status = 'in_review')
      )
    when 'manager' then v_from_status = 'in_review' and p_to_status in ('accepted', 'rework')
  end) is not true then
    raise exception using errcode = '22023', message = 'Task status transition is not allowed';
  end if;

  if p_to_status = 'rework' and (p_comment ~ '[^[:space:]]') is not true then
    raise exception using errcode = '22023', message = 'Rework requires a nonblank comment';
  end if;

  update public.tasks
  set status = p_to_status, updated_at = pg_catalog.clock_timestamp()
  where id = p_task_id
  returning * into v_task;

  insert into public.task_events (task_id, actor_id, type, from_status, to_status, comment, created_at)
  values (p_task_id, v_actor_id, 'status_changed', v_from_status, p_to_status, p_comment, v_task.updated_at);

  return v_task;
end;
$$;

-- SQL-standard bodies bind the private calls at definition time. Callers need
-- EXECUTE on those functions, but no USAGE on the private schema.
create function public.create_object(
  p_name text, p_address text
)
returns public.objects
language sql
security invoker
set search_path = ''
begin atomic
  return private.create_object(p_name, p_address);
end;

create function public.update_object(
  p_object_id uuid, p_name text, p_address text
)
returns public.objects
language sql
security invoker
set search_path = ''
begin atomic
  return private.update_object(p_object_id, p_name, p_address);
end;

create function public.archive_object(
  p_object_id uuid
)
returns public.objects
language sql
security invoker
set search_path = ''
begin atomic
  return private.archive_object(p_object_id);
end;

create function public.create_task(
  p_object_id uuid, p_title text, p_description text, p_assignee_id uuid
)
returns public.tasks
language sql
security invoker
set search_path = ''
begin atomic
  return private.create_task(p_object_id, p_title, p_description, p_assignee_id);
end;

create function public.update_task(
  p_task_id uuid, p_object_id uuid, p_title text, p_description text
)
returns public.tasks
language sql
security invoker
set search_path = ''
begin atomic
  return private.update_task(p_task_id, p_object_id, p_title, p_description);
end;

create function public.archive_task(
  p_task_id uuid
)
returns public.tasks
language sql
security invoker
set search_path = ''
begin atomic
  return private.archive_task(p_task_id);
end;

create function public.reassign_task(
  p_task_id uuid, p_expected_assignee_id uuid, p_assignee_id uuid
)
returns public.tasks
language sql
security invoker
set search_path = ''
begin atomic
  return private.reassign_task(p_task_id, p_expected_assignee_id, p_assignee_id);
end;

create function public.transition_task(
  p_task_id uuid, p_expected_status public.task_status, p_to_status public.task_status,
  p_comment text default null
)
returns public.tasks
language sql
security invoker
set search_path = ''
begin atomic
  return private.transition_task(p_task_id, p_expected_status, p_to_status, p_comment);
end;

revoke all on function
  private.require_manager(), private.lock_active_object(uuid), private.lock_active_task(uuid),
  private.create_object(text, text),
  private.update_object(uuid, text, text),
  private.archive_object(uuid),
  private.create_task(uuid, text, text, uuid),
  private.update_task(uuid, uuid, text, text),
  private.archive_task(uuid),
  private.reassign_task(uuid, uuid, uuid),
  private.transition_task(uuid, public.task_status, public.task_status, text),
  public.create_object(text, text),
  public.update_object(uuid, text, text),
  public.archive_object(uuid),
  public.create_task(uuid, text, text, uuid),
  public.update_task(uuid, uuid, text, text),
  public.archive_task(uuid),
  public.reassign_task(uuid, uuid, uuid),
  public.transition_task(uuid, public.task_status, public.task_status, text)
from public, anon, authenticated, service_role;

grant execute on function
  private.create_object(text, text),
  private.update_object(uuid, text, text),
  private.archive_object(uuid),
  private.create_task(uuid, text, text, uuid),
  private.update_task(uuid, uuid, text, text),
  private.archive_task(uuid),
  private.reassign_task(uuid, uuid, uuid),
  private.transition_task(uuid, public.task_status, public.task_status, text),
  public.create_object(text, text),
  public.update_object(uuid, text, text),
  public.archive_object(uuid),
  public.create_task(uuid, text, text, uuid),
  public.update_task(uuid, uuid, text, text),
  public.archive_task(uuid),
  public.reassign_task(uuid, uuid, uuid),
  public.transition_task(uuid, public.task_status, public.task_status, text)
to authenticated;

commit;
