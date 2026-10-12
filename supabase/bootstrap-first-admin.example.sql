-- ONE-TIME TRUSTED OPERATOR PROCEDURE. Run in the Supabase SQL editor as the
-- project database owner after creating/inviting the intended user in Auth.
-- Replace the UUID below with that user's auth.users.id before execution.
-- Never expose this operation through a public route or client API.
do $$
declare
  target_user_id_text text := 'REPLACE_WITH_AUTH_USER_UUID';
  target_user_id uuid;
begin
  -- Serialize competing first-admin attempts so only one operator can win.
  perform pg_advisory_xact_lock(72811904, 1);
  if target_user_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Replace REPLACE_WITH_AUTH_USER_UUID with the invited Auth user UUID';
  end if;
  target_user_id := target_user_id_text::uuid;
  if exists (select 1 from public.profiles where role = 'administrator') then
    raise exception 'An administrator already exists; use set_profile_role as an existing administrator';
  end if;
  update public.profiles set role = 'administrator', updated_at = now() where user_id = target_user_id;
  if not found then raise exception 'No profile exists for the supplied Auth user UUID'; end if;
end
$$;
