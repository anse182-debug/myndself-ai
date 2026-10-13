-- Account data operations: service-role RPC only, always scoped by backend identity.
create function public.export_personal_data(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare identity jsonb; result jsonb; rows jsonb; account_email text; t text;
begin
 select jsonb_build_object('id',id,'email',email,'created_at',created_at,'user_metadata',raw_user_meta_data),
 case when email_confirmed_at is not null then email end into identity,account_email from auth.users where id=p_user_id;
 if identity is null then raise exception 'account_missing'; end if;
 result := jsonb_build_object('version',1,'exported_at',now(),'account',identity);
 foreach t in array array['mood_entries','summary_entries','mood_chats','emotion_profile','ai_memory','agent_ritual_events','user_flags','weekly_email_log','therapist_shares','mood_summaries','guided_history','chat_sessions','reflection_sessions'] loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x) - ''token_hash'' - ''embedding''), ''[]''::jsonb) from (select * from public.%I where user_id::text=$1::text limit 5001) x',t) into rows using p_user_id;
  if jsonb_array_length(rows)>5000 then raise exception 'export_too_large'; end if;
  result := result || jsonb_build_object(t,rows);
 end loop;
 foreach t in array array['therapist_invites','therapist_links'] loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from (select * from public.%I where patient_id=$1 limit 5001) x',t) into rows using p_user_id;
  if jsonb_array_length(rows)>5000 then raise exception 'export_too_large'; end if;
  result := result || jsonb_build_object(t,rows);
 end loop;
 select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into rows from public.subscribers s where account_email is not null and lower(s.email)=lower(account_email);
 result := result || jsonb_build_object('subscribers',rows);
 return result;
end $$;
revoke all on function public.export_personal_data(uuid) from public, anon, authenticated;
grant execute on function public.export_personal_data(uuid) to service_role;

create function public.delete_personal_account(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare account_email text; t text;
begin
 -- Exclusive parent lock waits for guarded writes, then prevents new ones.
 select case when email_confirmed_at is not null then email end into account_email from auth.users where id=p_user_id for update;
 if not found then raise exception 'account_missing'; end if;
 if exists(select 1 from storage.objects where owner_id=p_user_id::text) then raise exception 'storage_cleanup_required'; end if;
 foreach t in array array['mood_entries','summary_entries','mood_chats','emotion_profile','ai_memory','agent_ritual_events','user_flags','weekly_email_log','therapist_shares','mood_summaries','guided_history','chat_sessions','reflection_sessions'] loop
  execute format('delete from public.%I where user_id::text=$1::text',t) using p_user_id;
 end loop;
 delete from public.therapist_invites where patient_id=p_user_id or (account_email is not null and lower(therapist_email)=lower(account_email));
 delete from public.therapist_links where patient_id=p_user_id or (account_email is not null and lower(therapist_email)=lower(account_email));
 delete from public.subscribers where account_email is not null and lower(email)=lower(account_email);
 delete from auth.users where id=p_user_id;
end $$;
revoke all on function public.delete_personal_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_personal_account(uuid) to service_role;

create function public.require_existing_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare account_id text;
begin
 account_id := to_jsonb(new)->>tg_argv[0];
 if account_id is not null then
  perform id from auth.users where id=account_id::uuid for key share;
  if not found then raise exception 'account_missing'; end if;
 end if;
 return new;
end $$;
revoke all on function public.require_existing_account() from public, anon, authenticated;
do $$ declare t text; begin
 foreach t in array array['mood_entries','summary_entries','mood_chats','emotion_profile','ai_memory','agent_ritual_events','user_flags','weekly_email_log','therapist_shares','mood_summaries','guided_history','chat_sessions','reflection_sessions'] loop
  execute format('create trigger account_exists_guard before insert or update of user_id on public.%I for each row execute function public.require_existing_account(''user_id'')',t);
 end loop;
 foreach t in array array['therapist_invites','therapist_links'] loop
  execute format('create trigger account_exists_guard before insert or update of patient_id on public.%I for each row execute function public.require_existing_account(''patient_id'')',t);
 end loop;
end $$;
