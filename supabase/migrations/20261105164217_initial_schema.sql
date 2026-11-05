begin;

create type public.user_role as enum ('manager', 'executor');

create type public.task_status as enum (
  'new', 'in_progress', 'in_review', 'rework', 'accepted'
);

create type public.task_event_type as enum (
  'created', 'status_changed', 'assignee_changed'
);

create table public.profiles (
  id uuid primary key references auth.users (id),
  full_name text not null check (full_name ~ '[^[:space:]]'),
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name ~ '[^[:space:]]'),
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id),
  title text not null check (title ~ '[^[:space:]]'),
  description text not null default '',
  assignee_id uuid not null references public.profiles (id),
  author_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id),
  actor_id uuid not null references public.profiles (id),
  type public.task_event_type not null,
  from_status public.task_status,
  to_status public.task_status,
  old_assignee_id uuid references public.profiles (id),
  new_assignee_id uuid references public.profiles (id),
  comment text,
  created_at timestamptz not null default now(),
  constraint task_events_valid_shape check (
    case type
      when 'created' then
        from_status is null
        and to_status is not distinct from 'new'
        and old_assignee_id is null
        and new_assignee_id is null
      when 'status_changed' then
        from_status is not null
        and to_status is not null
        and from_status <> to_status
        and old_assignee_id is null
        and new_assignee_id is null
      when 'assignee_changed' then
        from_status is null
        and to_status is null
        and old_assignee_id is not null
        and new_assignee_id is not null
        and old_assignee_id <> new_assignee_id
    end
  )
);

create index objects_active_created_at_idx on public.objects (created_at desc)
  where deleted_at is null;

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_active_created_at_idx on public.tasks (created_at desc)
  where deleted_at is null;

create index task_events_task_id_created_at_idx
  on public.task_events (task_id, created_at);
create unique index task_events_one_created_per_task_idx
  on public.task_events (task_id) where type = 'created';

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;

revoke all privileges on table public.profiles, public.objects, public.tasks, public.task_events
  from public, anon, authenticated;

commit;
