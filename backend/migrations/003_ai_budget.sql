-- Aggregate operational counters only; no user identifiers or content.
create table app_private.ai_budget_months (
 month date primary key,
 reserved_microusd bigint not null default 0 check (reserved_microusd >= 0),
 calls bigint not null default 0,
 input_tokens bigint not null default 0,
 output_tokens bigint not null default 0
);
revoke all on app_private.ai_budget_months from public, anon, authenticated;

create function public.reserve_ai_budget(p_cost bigint, p_limit bigint) returns date
language plpgsql security definer set search_path = '' as $$
declare period date := date_trunc('month', now() at time zone 'UTC')::date; accepted date;
begin
 if p_cost is null or p_limit is null or p_cost <= 0 or p_limit <= 0 or p_limit > 1000000000 then raise exception 'invalid_ai_budget'; end if;
 insert into app_private.ai_budget_months(month) values(period) on conflict do nothing;
 update app_private.ai_budget_months set reserved_microusd = reserved_microusd + p_cost, calls = calls + 1
 where month = period and reserved_microusd <= p_limit - p_cost returning month into accepted;
 if accepted is null then raise exception 'ai_budget_exhausted'; end if;
 return accepted;
end;
$$;
revoke all on function public.reserve_ai_budget(bigint,bigint) from public, anon, authenticated;
grant execute on function public.reserve_ai_budget(bigint,bigint) to service_role;

create function public.record_ai_usage(p_month date, p_input bigint, p_output bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if p_input is null or p_output is null or p_input < 0 or p_output < 0 then raise exception 'invalid_ai_usage'; end if;
 update app_private.ai_budget_months set input_tokens = input_tokens + p_input, output_tokens = output_tokens + p_output where month = p_month;
end;
$$;
revoke all on function public.record_ai_usage(date,bigint,bigint) from public, anon, authenticated;
grant execute on function public.record_ai_usage(date,bigint,bigint) to service_role;
