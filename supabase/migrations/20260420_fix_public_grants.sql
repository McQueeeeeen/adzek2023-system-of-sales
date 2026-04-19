-- Fix permissions for PostgREST/Supabase client access.
-- Required when schema/table grants were revoked manually.

grant usage on schema public to authenticated;
grant usage on schema public to anon;

do $$
declare
  tbl text;
  tables_to_grant text[] := array[
    'public.profiles',
    'public.clients',
    'public.client_activities',
    'public.crm_profiles',
    'public.crm_clients',
    'public.crm_client_activities',
    'public.crm_whatsapp_templates',
    'public.ai_message_generations'
  ];
begin
  foreach tbl in array tables_to_grant
  loop
    if to_regclass(tbl) is not null then
      execute format('grant select, insert, update, delete on table %s to authenticated', tbl);
    end if;
  end loop;
end
$$;

grant usage, select on all sequences in schema public to authenticated;
