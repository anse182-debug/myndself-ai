with objects as (
 select 'relation' as kind, c.relname as name, jsonb_build_object('kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'options',c.reloptions) as definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' or (n.nspname='app_private' and c.relname='ai_budget_months')) and c.relkind in ('r','v','m','S')
 union all
 select 'column',c.table_name||'.'||c.column_name,to_jsonb(c)-'table_catalog' from information_schema.columns c where (table_schema='public' or (table_schema='app_private' and table_name='ai_budget_months'))
 union all
 select 'constraint',r.relname||'.'||c.conname,jsonb_build_object('definition',pg_get_constraintdef(c.oid,true)) from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where (n.nspname='public' or (n.nspname='app_private' and r.relname='ai_budget_months'))
 union all
 select 'index',tablename||'.'||indexname,jsonb_build_object('definition',indexdef) from pg_indexes where (schemaname='public' or (schemaname='app_private' and tablename='ai_budget_months'))
 union all
 select 'policy',tablename||'.'||policyname,to_jsonb(p) from pg_policies p where (schemaname='public' or (schemaname='app_private' and tablename='ai_budget_months'))
 union all
 select 'view',c.relname,jsonb_build_object('definition',pg_get_viewdef(c.oid,true)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' or (n.nspname='app_private' and c.relname='ai_budget_months')) and c.relkind in ('v','m')
 union all
 select 'function',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',case when p.proname='match_ai_memory' then jsonb_build_object('definition',pg_get_functiondef(p.oid)) else jsonb_build_object('definition',pg_get_functiondef(p.oid),'acl',p.proacl) end from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('match_ai_memory','export_personal_data','delete_personal_account','require_existing_account','reserve_ai_budget','record_ai_usage')
 union all
 select 'trigger',c.relname||'.'||t.tgname,jsonb_build_object('definition',pg_get_triggerdef(t.oid,true)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and t.tgname='account_exists_guard'
 union all
 select 'grant',table_name||'.'||grantee||'.'||privilege_type,to_jsonb(g)-'table_catalog'-'grantor' from information_schema.role_table_grants g where (table_schema='public' or (table_schema='app_private' and table_name='ai_budget_months'))
 union all
 select 'sequence',sequence_name,to_jsonb(s)-'sequence_catalog' from information_schema.sequences s where sequence_schema='public'
)
select kind,name,definition from objects order by kind,name;
