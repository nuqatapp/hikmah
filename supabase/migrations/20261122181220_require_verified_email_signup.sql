-- Enable this Before User Created hook only after the new frontend and backend are live.
-- The Auth service can consume only short-lived admissions from the private settings table.
grant usage on schema hikmah to supabase_auth_admin;
grant select, delete on hikmah.site_settings to supabase_auth_admin;
create policy auth_read_signup_admissions on hikmah.site_settings
  for select to supabase_auth_admin using (key like 'admit:%');
create policy auth_consume_signup_admissions on hikmah.site_settings
  for delete to supabase_auth_admin using (key like 'admit:%');

create function hikmah.require_verified_email_signup(event jsonb)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare
  ticket text := event #>> '{user,user_metadata,hikmah_signup_ticket}';
  email text := lower(trim(event #>> '{user,email}'));
  admission text;
begin
  -- OAuth providers authenticate through their own interaction.
  if event #>> '{user,app_metadata,provider}' <> 'email' then return '{}'::jsonb; end if;
  if length(ticket)=36 and email is not null then
    admission := 'admit:' || encode(sha256(convert_to(email || ':' || ticket,'UTF8')),'hex');
    delete from hikmah.site_settings where key=admission
      and value > (floor(extract(epoch from clock_timestamp())*1000)::bigint)::text;
    if found then return '{}'::jsonb; end if;
  end if;
  return '{"error":{"http_code":403,"message":"Complete verification on the Hikmah signup page."}}'::jsonb;
end;
$$;
revoke all on function hikmah.require_verified_email_signup(jsonb) from public, anon, authenticated;
grant execute on function hikmah.require_verified_email_signup(jsonb) to supabase_auth_admin;
