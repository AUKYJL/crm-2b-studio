-- Profiles are provisioned by the local administrator after Admin Auth creates the users.
grant select (id), insert (id, full_name, role) on public.profiles to service_role;
