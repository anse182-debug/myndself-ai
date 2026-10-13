-- Application public schema only; apply to an EMPTY Supabase database. No user data.
begin;
set local check_function_bodies = off;
create schema if not exists "extensions"; create extension if not exists "pgcrypto" with schema "extensions";
create schema if not exists "extensions"; create extension if not exists "uuid-ossp" with schema "extensions";
create schema if not exists "public"; create extension if not exists "vector" with schema "public";
create sequence public."guided_history_id_seq";
create sequence public."therapist_shares_id_seq";
create table public."mood_entries" (id uuid default gen_random_uuid() not null, mood text not null, note text, reflection text, created_at timestamp with time zone default now(), user_id text, tags text[], at timestamp with time zone default now());
create table public."summary_entries" (id uuid default gen_random_uuid() not null, user_id text not null, summary text not null, created_at timestamp with time zone default now() not null);
create table public."mood_chats" (id uuid default uuid_generate_v4() not null, user_id uuid, messages jsonb not null, created_at timestamp with time zone default now());
create table public."emotion_profile" (user_id uuid not null, dominant_tags text[], last_mood text, avg_entries_week integer default 0, updated_at timestamp with time zone default now());
create table public."ai_memory" (id uuid default uuid_generate_v4() not null, user_id uuid not null, source text not null, content text not null, embedding vector(1536), created_at timestamp with time zone default now());
create table public."subscribers" (id uuid default uuid_generate_v4() not null, email text not null, created_at timestamp with time zone default now(), mentor_style text);
create table public."therapist_invites" (id uuid default gen_random_uuid() not null, patient_id uuid not null, therapist_email text not null, status text default 'pending'::text not null, created_at timestamp with time zone default now() not null);
create table public."therapist_links" (id uuid default gen_random_uuid() not null, patient_id uuid not null, therapist_email text not null, is_active boolean default true not null, consent_guided_history boolean default false not null, consent_mood_entries boolean default true not null, created_at timestamp with time zone default now() not null);
create table public."agent_ritual_events" (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default now() not null, user_id uuid not null, event_type text not null, mode text, outcome text, session_id text, days_since_last_checkin integer, checkins_last_4d integer, checkins_last_7d integer, heavy_notes_7d integer, interactions_3d integer, guided_sessions_7d integer, recent_intensity_score integer, mirror_emotion text, mirror_occurrences_7d integer, mirror_days_since_last_seen integer, meta jsonb);
create table public."user_flags" (user_id uuid not null, welcome_sent boolean default false not null, created_at timestamp with time zone default now() not null);
create table public."weekly_email_log" (id uuid default gen_random_uuid() not null, user_id uuid not null, sent_at timestamp with time zone default now(), status text default 'sent'::text, error text);
create table public."therapist_shares" (id bigint default nextval('therapist_shares_id_seq'::regclass) not null, user_id text not null, token_hash text not null, created_at timestamp with time zone default now() not null, expires_at timestamp with time zone, revoked boolean default false not null);
create table public."mood_summaries" (id uuid default gen_random_uuid() not null, user_id uuid not null, summary text not null, tags text[] default '{}'::text[], mood_score numeric, created_at timestamp with time zone default now() not null);
create table public."guided_history" (id bigint default nextval('guided_history_id_seq'::regclass) not null, user_id uuid not null, role text not null, content text not null, created_at timestamp with time zone default now() not null);
create table public."chat_sessions" (id uuid default uuid_generate_v4() not null, user_id uuid not null, messages jsonb not null, reply text, type text default 'free'::text, step integer, created_at timestamp with time zone default now());
CREATE OR REPLACE FUNCTION public.match_ai_memory(query_embedding vector, match_count integer, match_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, content text, source text, created_at timestamp with time zone, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    ai_memory.id,
    ai_memory.user_id,
    ai_memory.content,
    ai_memory.source,
    ai_memory.created_at,
    1 - (ai_memory.embedding <=> query_embedding) as similarity
  from ai_memory
  where ai_memory.user_id = match_user_id
  order by ai_memory.embedding <=> query_embedding
  limit match_count;
$function$
;
alter table public."mood_entries" add constraint "mood_entries_pkey" PRIMARY KEY (id);
alter table public."summary_entries" add constraint "mood_summaries_pkey" PRIMARY KEY (id);
alter table public."mood_chats" add constraint "mood_chats_pkey" PRIMARY KEY (id);
alter table public."mood_chats" add constraint "mood_chats_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."emotion_profile" add constraint "emotion_profile_pkey" PRIMARY KEY (user_id);
alter table public."emotion_profile" add constraint "emotion_profile_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."ai_memory" add constraint "ai_memory_pkey" PRIMARY KEY (id);
alter table public."ai_memory" add constraint "ai_memory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."subscribers" add constraint "subscribers_email_key" UNIQUE (email);
alter table public."subscribers" add constraint "subscribers_pkey" PRIMARY KEY (id);
alter table public."therapist_invites" add constraint "therapist_invites_pkey" PRIMARY KEY (id);
alter table public."therapist_links" add constraint "therapist_links_pkey" PRIMARY KEY (id);
alter table public."agent_ritual_events" add constraint "agent_ritual_events_pkey" PRIMARY KEY (id);
alter table public."user_flags" add constraint "user_flags_pkey" PRIMARY KEY (user_id);
alter table public."user_flags" add constraint "user_flags_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."weekly_email_log" add constraint "weekly_email_log_pkey" PRIMARY KEY (id);
alter table public."therapist_shares" add constraint "therapist_shares_pkey" PRIMARY KEY (id);
alter table public."therapist_shares" add constraint "therapist_shares_token_hash_key" UNIQUE (token_hash);
alter table public."mood_summaries" add constraint "mood_summaries_pkey1" PRIMARY KEY (id);
alter table public."guided_history" add constraint "guided_history_pkey" PRIMARY KEY (id);
alter table public."guided_history" add constraint "guided_history_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])));
alter table public."guided_history" add constraint "guided_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."chat_sessions" add constraint "chat_sessions_pkey" PRIMARY KEY (id);
CREATE INDEX idx_mood_summaries_user_id ON public.summary_entries USING btree (user_id, created_at DESC);
CREATE INDEX idx_mood_chats_user_id ON public.mood_chats USING btree (user_id);
CREATE INDEX ai_memory_user_id_idx ON public.ai_memory USING btree (user_id);
CREATE INDEX idx_agent_ritual_events_created_at ON public.agent_ritual_events USING btree (created_at DESC);
CREATE INDEX idx_agent_ritual_events_user_id ON public.agent_ritual_events USING btree (user_id);
CREATE INDEX idx_agent_ritual_events_event_type ON public.agent_ritual_events USING btree (event_type);
CREATE INDEX idx_agent_ritual_events_mode ON public.agent_ritual_events USING btree (mode);
CREATE INDEX idx_weekly_email_log_user_sent ON public.weekly_email_log USING btree (user_id, sent_at DESC);
CREATE INDEX therapist_shares_user_id_idx ON public.therapist_shares USING btree (user_id);
CREATE INDEX therapist_shares_token_hash_idx ON public.therapist_shares USING btree (token_hash);
CREATE INDEX chat_sessions_user_id_idx ON public.chat_sessions USING btree (user_id);
CREATE INDEX chat_sessions_type_idx ON public.chat_sessions USING btree (type);
create view public."v_mood_daily" as  SELECT user_id,
    date(at) AS day,
    count(*) AS entries,
    json_agg(json_build_object('mood', mood, 'tags', COALESCE(tags, '{}'::text[]))) AS items
   FROM mood_entries
  GROUP BY user_id, (date(at))
  ORDER BY user_id, (date(at)) DESC;
create view public."mynd_activation_30d" as  WITH logins AS (
         SELECT DISTINCT (chat_sessions.user_id)::text AS user_id
           FROM chat_sessions
          WHERE (chat_sessions.created_at >= (now() - '30 days'::interval))
        ), reflections AS (
         SELECT DISTINCT mood_entries.user_id
           FROM mood_entries
          WHERE (mood_entries.at >= (now() - '30 days'::interval))
        )
 SELECT COALESCE(((count(DISTINCT reflections.user_id))::double precision / (NULLIF(count(DISTINCT logins.user_id), 0))::double precision), (0)::double precision) AS activation_rate,
    count(DISTINCT logins.user_id) AS total_logged_in,
    count(DISTINCT reflections.user_id) AS total_with_reflection
   FROM (logins
     LEFT JOIN reflections USING (user_id));
create view public."kpi_guided_completion_rate_weekly" as  SELECT date_trunc('week'::text, created_at) AS week_start,
    count(*) AS guided_started,
    count(*) FILTER (WHERE (length(TRIM(BOTH FROM COALESCE(content, ''::text))) >= 120)) AS guided_completed,
    ((count(*) FILTER (WHERE (length(TRIM(BOTH FROM COALESCE(content, ''::text))) >= 120)))::double precision / (NULLIF(count(*), 0))::double precision) AS completion_rate
   FROM guided_history
  GROUP BY (date_trunc('week'::text, created_at))
  ORDER BY (date_trunc('week'::text, created_at));
create view public."mynd_reflections_7d" as  WITH reflections_7d AS (
         SELECT mood_entries.user_id,
            count(*) AS reflections_count
           FROM mood_entries
          WHERE (mood_entries.at >= (now() - '7 days'::interval))
          GROUP BY mood_entries.user_id
        )
 SELECT avg(reflections_count) AS avg_reflections_per_user,
    count(*) AS users_with_reflections_7d
   FROM reflections_7d;
create view public."v_emotion_mirror_last_7d" as  WITH moods AS (
         SELECT (mood_entries.user_id)::uuid AS user_id,
            mood_entries.created_at,
            unnest(string_to_array(mood_entries.mood, ','::text)) AS mood_raw
           FROM mood_entries
          WHERE ((mood_entries.mood IS NOT NULL) AND (length(TRIM(BOTH FROM mood_entries.mood)) > 0))
        ), normalized AS (
         SELECT moods.user_id,
            moods.created_at,
            TRIM(BOTH FROM moods.mood_raw) AS emotion
           FROM moods
          WHERE (length(TRIM(BOTH FROM moods.mood_raw)) > 0)
        ), last_7d AS (
         SELECT normalized.user_id,
            normalized.emotion,
            count(*) FILTER (WHERE (normalized.created_at >= (now() - '7 days'::interval))) AS occurrences_7d,
            max(normalized.created_at) FILTER (WHERE (normalized.created_at >= (now() - '7 days'::interval))) AS last_seen_at
           FROM normalized
          GROUP BY normalized.user_id, normalized.emotion
        )
 SELECT user_id,
    emotion,
    COALESCE(occurrences_7d, (0)::bigint) AS occurrences_7d,
    last_seen_at,
        CASE
            WHEN (last_seen_at IS NULL) THEN NULL::integer
            ELSE (CURRENT_DATE - (last_seen_at)::date)
        END AS days_since_last_seen
   FROM last_7d;
create view public."v_ritual_checkins_day_index" as  SELECT (me.user_id)::uuid AS user_id,
    me.id AS mood_entry_id,
    me.created_at AS checkin_at,
    u.created_at AS user_created_at,
    GREATEST(1, LEAST(7, (((me.created_at)::date - (u.created_at)::date) + 1))) AS day_index
   FROM (mood_entries me
     JOIN auth.users u ON ((u.id = (me.user_id)::uuid)));
create view public."v_ritual_7d_completion_per_user" as  WITH per_user_day AS (
         SELECT DISTINCT v_ritual_checkins_day_index.user_id,
            v_ritual_checkins_day_index.day_index
           FROM v_ritual_checkins_day_index
          WHERE ((v_ritual_checkins_day_index.day_index >= 1) AND (v_ritual_checkins_day_index.day_index <= 7))
        )
 SELECT user_id,
    count(*) AS days_completed_7d,
    round(((100.0 * (count(*))::numeric) / 7.0), 1) AS completion_pct_7d
   FROM per_user_day
  GROUP BY user_id;
create view public."v_ritual_7d_completion_summary" as  SELECT count(*) AS users_considered,
    round(avg(days_completed_7d), 2) AS avg_days_completed_7d,
    round(((100.0 * (count(*) FILTER (WHERE (days_completed_7d >= 3)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS pct_users_3plus_days,
    round(((100.0 * (count(*) FILTER (WHERE (days_completed_7d >= 5)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS pct_users_5plus_days
   FROM v_ritual_7d_completion_per_user;
create view public."v_mood_calendar" as  SELECT user_id,
    date(at) AS day,
    mood,
    tags
   FROM mood_entries
  ORDER BY (date(at));
create view public."v_emotion_frequency_last_7d" as  WITH moods AS (
         SELECT (mood_entries.user_id)::uuid AS user_id,
            mood_entries.created_at,
            unnest(string_to_array(mood_entries.mood, ','::text)) AS mood_raw
           FROM mood_entries
          WHERE ((mood_entries.created_at >= (now() - '7 days'::interval)) AND (mood_entries.mood IS NOT NULL) AND (length(TRIM(BOTH FROM mood_entries.mood)) > 0))
        ), normalized AS (
         SELECT moods.user_id,
            TRIM(BOTH FROM moods.mood_raw) AS emotion
           FROM moods
          WHERE (length(TRIM(BOTH FROM moods.mood_raw)) > 0)
        )
 SELECT user_id,
    emotion,
    count(*) AS occurrences_7d
   FROM normalized
  GROUP BY user_id, emotion;
create view public."v_reflection_events" as  SELECT gh.user_id,
    gh.created_at,
    'guided'::text AS source
   FROM guided_history gh
  WHERE (length(TRIM(BOTH FROM COALESCE(gh.content, ''::text))) > 0)
UNION ALL
 SELECT (me.user_id)::uuid AS user_id,
    me.created_at,
    'mood_entry'::text AS source
   FROM mood_entries me
  WHERE (length(TRIM(BOTH FROM COALESCE(me.note, ''::text))) > 0);
create view public."kpi_reflection_mix_last_7d" as  SELECT source,
    count(*) AS events_last_7d,
    count(DISTINCT user_id) AS users_last_7d
   FROM v_reflection_events
  WHERE (created_at >= (now() - '7 days'::interval))
  GROUP BY source
  ORDER BY (count(*)) DESC;
create view public."kpi_reflection_days_last_7d" as  WITH daily AS (
         SELECT v_reflection_events.user_id,
            (date_trunc('day'::text, v_reflection_events.created_at))::date AS day
           FROM v_reflection_events
          GROUP BY v_reflection_events.user_id, ((date_trunc('day'::text, v_reflection_events.created_at))::date)
        )
 SELECT user_id,
    count(*) AS active_days_last_7d
   FROM daily
  WHERE (day >= (CURRENT_DATE - 6))
  GROUP BY user_id
  ORDER BY (count(*)) DESC;
create view public."mynd_wrr_by_week" as  WITH weekly_reflections AS (
         SELECT mood_entries.user_id,
            date_trunc('week'::text, mood_entries.at) AS week_start,
            count(*) AS reflections_count
           FROM mood_entries
          GROUP BY mood_entries.user_id, (date_trunc('week'::text, mood_entries.at))
        ), stats AS (
         SELECT weekly_reflections.week_start,
            count(*) AS users_with_reflections,
            count(*) FILTER (WHERE (weekly_reflections.reflections_count >= 2)) AS returning_reflectors
           FROM weekly_reflections
          GROUP BY weekly_reflections.week_start
        )
 SELECT week_start,
    users_with_reflections,
    returning_reflectors,
    COALESCE(((returning_reflectors)::double precision / (NULLIF(users_with_reflections, 0))::double precision), (0)::double precision) AS wrr_ratio
   FROM stats
  ORDER BY week_start DESC;
create view public."v_ritual_7d_adherence" as  WITH per_user_day AS (
         SELECT DISTINCT v_ritual_checkins_day_index.user_id,
            v_ritual_checkins_day_index.day_index
           FROM v_ritual_checkins_day_index
        ), max_day AS (
         SELECT per_user_day.user_id,
            max(per_user_day.day_index) AS max_day_reached
           FROM per_user_day
          GROUP BY per_user_day.user_id
        )
 SELECT d.day_index,
    count(*) FILTER (WHERE (m.max_day_reached >= d.day_index)) AS users_reached_day,
    count(*) AS total_users,
    round(((100.0 * (count(*) FILTER (WHERE (m.max_day_reached >= d.day_index)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS reach_rate_pct
   FROM (max_day m
     CROSS JOIN ( SELECT generate_series(1, 7) AS day_index) d)
  GROUP BY d.day_index
  ORDER BY d.day_index;
create view public."mynd_emotional_breadth_7d" as  WITH recent AS (
         SELECT mood_entries.user_id,
            mood_entries.tags
           FROM mood_entries
          WHERE (mood_entries.at >= (now() - '7 days'::interval))
        ), exploded AS (
         SELECT recent.user_id,
            unnest(recent.tags) AS tag
           FROM recent
          WHERE (recent.tags IS NOT NULL)
        ), per_user AS (
         SELECT exploded.user_id,
            count(DISTINCT exploded.tag) AS distinct_tags_7d
           FROM exploded
          GROUP BY exploded.user_id
        )
 SELECT avg(distinct_tags_7d) AS avg_distinct_tags_7d,
    count(*) AS users_counted
   FROM per_user;
create view public."kpi_time_to_first_reflection" as  WITH first_reflection AS (
         SELECT v_reflection_events.user_id,
            min(v_reflection_events.created_at) AS first_reflection_at
           FROM v_reflection_events
          GROUP BY v_reflection_events.user_id
        )
 SELECT u.id AS user_id,
    u.created_at AS signup_at,
    fr.first_reflection_at,
    (EXTRACT(epoch FROM (fr.first_reflection_at - u.created_at)) / 60.0) AS minutes_to_first_reflection
   FROM (auth.users u
     JOIN first_reflection fr ON ((fr.user_id = u.id)));
create view public."v_emotion_tags" as  WITH unnest_tags AS (
         SELECT mood_entries.user_id,
            unnest(mood_entries.tags) AS tag
           FROM mood_entries
          WHERE (mood_entries.tags IS NOT NULL)
        )
 SELECT user_id,
    tag,
    count(*) AS tag_count
   FROM unnest_tags
  GROUP BY user_id, tag
  ORDER BY user_id, (count(*)) DESC;
create view public."kpi_reflection_days_last_7d_distribution" as  SELECT active_days_last_7d,
    count(*) AS users
   FROM kpi_reflection_days_last_7d
  GROUP BY active_days_last_7d
  ORDER BY active_days_last_7d DESC;
create policy "mood_entries_delete_own" on public."mood_entries" as PERMISSIVE for DELETE to "authenticated" using (((user_id)::uuid = auth.uid()));
create policy "mood_entries_insert_own" on public."mood_entries" as PERMISSIVE for INSERT to "authenticated" with check (((user_id)::uuid = auth.uid()));
create policy "mood_entries_select_own" on public."mood_entries" as PERMISSIVE for SELECT to "authenticated" using (((user_id)::uuid = auth.uid()));
create policy "mood_entries_update_own" on public."mood_entries" as PERMISSIVE for UPDATE to "authenticated" using (((user_id)::uuid = auth.uid())) with check (((user_id)::uuid = auth.uid()));
create policy "therapist_invites_patient_own" on public."therapist_invites" as PERMISSIVE for ALL to "authenticated" using ((patient_id = auth.uid())) with check ((patient_id = auth.uid()));
create policy "therapist_links_patient_own" on public."therapist_links" as PERMISSIVE for ALL to "authenticated" using ((patient_id = auth.uid())) with check ((patient_id = auth.uid()));
create policy "User can manage own guided history" on public."guided_history" as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
alter table public."mood_entries" enable row level security;
alter table public."summary_entries" enable row level security;
alter table public."mood_chats" enable row level security;
alter table public."emotion_profile" enable row level security;
alter table public."ai_memory" enable row level security;
alter table public."subscribers" enable row level security;
alter table public."therapist_invites" enable row level security;
alter table public."therapist_links" enable row level security;
alter table public."agent_ritual_events" enable row level security;
alter table public."user_flags" enable row level security;
alter table public."weekly_email_log" enable row level security;
alter table public."therapist_shares" enable row level security;
alter table public."mood_summaries" enable row level security;
alter table public."guided_history" enable row level security;
alter table public."chat_sessions" enable row level security;
grant INSERT on public."mood_entries" to "anon";
grant SELECT on public."mood_entries" to "anon";
grant UPDATE on public."mood_entries" to "anon";
grant DELETE on public."mood_entries" to "anon";
grant TRUNCATE on public."mood_entries" to "anon";
grant REFERENCES on public."mood_entries" to "anon";
grant TRIGGER on public."mood_entries" to "anon";
grant INSERT on public."mood_entries" to "authenticated";
grant SELECT on public."mood_entries" to "authenticated";
grant UPDATE on public."mood_entries" to "authenticated";
grant DELETE on public."mood_entries" to "authenticated";
grant TRUNCATE on public."mood_entries" to "authenticated";
grant REFERENCES on public."mood_entries" to "authenticated";
grant TRIGGER on public."mood_entries" to "authenticated";
grant INSERT on public."mood_entries" to "service_role";
grant SELECT on public."mood_entries" to "service_role";
grant UPDATE on public."mood_entries" to "service_role";
grant DELETE on public."mood_entries" to "service_role";
grant TRUNCATE on public."mood_entries" to "service_role";
grant REFERENCES on public."mood_entries" to "service_role";
grant TRIGGER on public."mood_entries" to "service_role";
grant INSERT on public."summary_entries" to "anon";
grant SELECT on public."summary_entries" to "anon";
grant UPDATE on public."summary_entries" to "anon";
grant DELETE on public."summary_entries" to "anon";
grant TRUNCATE on public."summary_entries" to "anon";
grant REFERENCES on public."summary_entries" to "anon";
grant TRIGGER on public."summary_entries" to "anon";
grant INSERT on public."summary_entries" to "authenticated";
grant SELECT on public."summary_entries" to "authenticated";
grant UPDATE on public."summary_entries" to "authenticated";
grant DELETE on public."summary_entries" to "authenticated";
grant TRUNCATE on public."summary_entries" to "authenticated";
grant REFERENCES on public."summary_entries" to "authenticated";
grant TRIGGER on public."summary_entries" to "authenticated";
grant INSERT on public."summary_entries" to "service_role";
grant SELECT on public."summary_entries" to "service_role";
grant UPDATE on public."summary_entries" to "service_role";
grant DELETE on public."summary_entries" to "service_role";
grant TRUNCATE on public."summary_entries" to "service_role";
grant REFERENCES on public."summary_entries" to "service_role";
grant TRIGGER on public."summary_entries" to "service_role";
grant INSERT on public."mood_chats" to "anon";
grant SELECT on public."mood_chats" to "anon";
grant UPDATE on public."mood_chats" to "anon";
grant DELETE on public."mood_chats" to "anon";
grant TRUNCATE on public."mood_chats" to "anon";
grant REFERENCES on public."mood_chats" to "anon";
grant TRIGGER on public."mood_chats" to "anon";
grant INSERT on public."mood_chats" to "authenticated";
grant SELECT on public."mood_chats" to "authenticated";
grant UPDATE on public."mood_chats" to "authenticated";
grant DELETE on public."mood_chats" to "authenticated";
grant TRUNCATE on public."mood_chats" to "authenticated";
grant REFERENCES on public."mood_chats" to "authenticated";
grant TRIGGER on public."mood_chats" to "authenticated";
grant INSERT on public."mood_chats" to "service_role";
grant SELECT on public."mood_chats" to "service_role";
grant UPDATE on public."mood_chats" to "service_role";
grant DELETE on public."mood_chats" to "service_role";
grant TRUNCATE on public."mood_chats" to "service_role";
grant REFERENCES on public."mood_chats" to "service_role";
grant TRIGGER on public."mood_chats" to "service_role";
grant INSERT on public."v_mood_daily" to "anon";
grant SELECT on public."v_mood_daily" to "anon";
grant UPDATE on public."v_mood_daily" to "anon";
grant DELETE on public."v_mood_daily" to "anon";
grant TRUNCATE on public."v_mood_daily" to "anon";
grant REFERENCES on public."v_mood_daily" to "anon";
grant TRIGGER on public."v_mood_daily" to "anon";
grant INSERT on public."v_mood_daily" to "authenticated";
grant SELECT on public."v_mood_daily" to "authenticated";
grant UPDATE on public."v_mood_daily" to "authenticated";
grant DELETE on public."v_mood_daily" to "authenticated";
grant TRUNCATE on public."v_mood_daily" to "authenticated";
grant REFERENCES on public."v_mood_daily" to "authenticated";
grant TRIGGER on public."v_mood_daily" to "authenticated";
grant INSERT on public."v_mood_daily" to "service_role";
grant SELECT on public."v_mood_daily" to "service_role";
grant UPDATE on public."v_mood_daily" to "service_role";
grant DELETE on public."v_mood_daily" to "service_role";
grant TRUNCATE on public."v_mood_daily" to "service_role";
grant REFERENCES on public."v_mood_daily" to "service_role";
grant TRIGGER on public."v_mood_daily" to "service_role";
grant INSERT on public."v_ritual_7d_completion_per_user" to "anon";
grant SELECT on public."v_ritual_7d_completion_per_user" to "anon";
grant UPDATE on public."v_ritual_7d_completion_per_user" to "anon";
grant DELETE on public."v_ritual_7d_completion_per_user" to "anon";
grant TRUNCATE on public."v_ritual_7d_completion_per_user" to "anon";
grant REFERENCES on public."v_ritual_7d_completion_per_user" to "anon";
grant TRIGGER on public."v_ritual_7d_completion_per_user" to "anon";
grant INSERT on public."v_ritual_7d_completion_per_user" to "authenticated";
grant SELECT on public."v_ritual_7d_completion_per_user" to "authenticated";
grant UPDATE on public."v_ritual_7d_completion_per_user" to "authenticated";
grant DELETE on public."v_ritual_7d_completion_per_user" to "authenticated";
grant TRUNCATE on public."v_ritual_7d_completion_per_user" to "authenticated";
grant REFERENCES on public."v_ritual_7d_completion_per_user" to "authenticated";
grant TRIGGER on public."v_ritual_7d_completion_per_user" to "authenticated";
grant INSERT on public."v_ritual_7d_completion_per_user" to "service_role";
grant SELECT on public."v_ritual_7d_completion_per_user" to "service_role";
grant UPDATE on public."v_ritual_7d_completion_per_user" to "service_role";
grant DELETE on public."v_ritual_7d_completion_per_user" to "service_role";
grant TRUNCATE on public."v_ritual_7d_completion_per_user" to "service_role";
grant REFERENCES on public."v_ritual_7d_completion_per_user" to "service_role";
grant TRIGGER on public."v_ritual_7d_completion_per_user" to "service_role";
grant INSERT on public."emotion_profile" to "anon";
grant SELECT on public."emotion_profile" to "anon";
grant UPDATE on public."emotion_profile" to "anon";
grant DELETE on public."emotion_profile" to "anon";
grant TRUNCATE on public."emotion_profile" to "anon";
grant REFERENCES on public."emotion_profile" to "anon";
grant TRIGGER on public."emotion_profile" to "anon";
grant INSERT on public."emotion_profile" to "authenticated";
grant SELECT on public."emotion_profile" to "authenticated";
grant UPDATE on public."emotion_profile" to "authenticated";
grant DELETE on public."emotion_profile" to "authenticated";
grant TRUNCATE on public."emotion_profile" to "authenticated";
grant REFERENCES on public."emotion_profile" to "authenticated";
grant TRIGGER on public."emotion_profile" to "authenticated";
grant INSERT on public."emotion_profile" to "service_role";
grant SELECT on public."emotion_profile" to "service_role";
grant UPDATE on public."emotion_profile" to "service_role";
grant DELETE on public."emotion_profile" to "service_role";
grant TRUNCATE on public."emotion_profile" to "service_role";
grant REFERENCES on public."emotion_profile" to "service_role";
grant TRIGGER on public."emotion_profile" to "service_role";
grant INSERT on public."v_ritual_7d_completion_summary" to "anon";
grant SELECT on public."v_ritual_7d_completion_summary" to "anon";
grant UPDATE on public."v_ritual_7d_completion_summary" to "anon";
grant DELETE on public."v_ritual_7d_completion_summary" to "anon";
grant TRUNCATE on public."v_ritual_7d_completion_summary" to "anon";
grant REFERENCES on public."v_ritual_7d_completion_summary" to "anon";
grant TRIGGER on public."v_ritual_7d_completion_summary" to "anon";
grant INSERT on public."v_ritual_7d_completion_summary" to "authenticated";
grant SELECT on public."v_ritual_7d_completion_summary" to "authenticated";
grant UPDATE on public."v_ritual_7d_completion_summary" to "authenticated";
grant DELETE on public."v_ritual_7d_completion_summary" to "authenticated";
grant TRUNCATE on public."v_ritual_7d_completion_summary" to "authenticated";
grant REFERENCES on public."v_ritual_7d_completion_summary" to "authenticated";
grant TRIGGER on public."v_ritual_7d_completion_summary" to "authenticated";
grant INSERT on public."v_ritual_7d_completion_summary" to "service_role";
grant SELECT on public."v_ritual_7d_completion_summary" to "service_role";
grant UPDATE on public."v_ritual_7d_completion_summary" to "service_role";
grant DELETE on public."v_ritual_7d_completion_summary" to "service_role";
grant TRUNCATE on public."v_ritual_7d_completion_summary" to "service_role";
grant REFERENCES on public."v_ritual_7d_completion_summary" to "service_role";
grant TRIGGER on public."v_ritual_7d_completion_summary" to "service_role";
grant INSERT on public."ai_memory" to "anon";
grant SELECT on public."ai_memory" to "anon";
grant UPDATE on public."ai_memory" to "anon";
grant DELETE on public."ai_memory" to "anon";
grant TRUNCATE on public."ai_memory" to "anon";
grant REFERENCES on public."ai_memory" to "anon";
grant TRIGGER on public."ai_memory" to "anon";
grant INSERT on public."ai_memory" to "authenticated";
grant SELECT on public."ai_memory" to "authenticated";
grant UPDATE on public."ai_memory" to "authenticated";
grant DELETE on public."ai_memory" to "authenticated";
grant TRUNCATE on public."ai_memory" to "authenticated";
grant REFERENCES on public."ai_memory" to "authenticated";
grant TRIGGER on public."ai_memory" to "authenticated";
grant INSERT on public."ai_memory" to "service_role";
grant SELECT on public."ai_memory" to "service_role";
grant UPDATE on public."ai_memory" to "service_role";
grant DELETE on public."ai_memory" to "service_role";
grant TRUNCATE on public."ai_memory" to "service_role";
grant REFERENCES on public."ai_memory" to "service_role";
grant TRIGGER on public."ai_memory" to "service_role";
grant INSERT on public."subscribers" to "anon";
grant SELECT on public."subscribers" to "anon";
grant UPDATE on public."subscribers" to "anon";
grant DELETE on public."subscribers" to "anon";
grant TRUNCATE on public."subscribers" to "anon";
grant REFERENCES on public."subscribers" to "anon";
grant TRIGGER on public."subscribers" to "anon";
grant INSERT on public."subscribers" to "authenticated";
grant SELECT on public."subscribers" to "authenticated";
grant UPDATE on public."subscribers" to "authenticated";
grant DELETE on public."subscribers" to "authenticated";
grant TRUNCATE on public."subscribers" to "authenticated";
grant REFERENCES on public."subscribers" to "authenticated";
grant TRIGGER on public."subscribers" to "authenticated";
grant INSERT on public."subscribers" to "service_role";
grant SELECT on public."subscribers" to "service_role";
grant UPDATE on public."subscribers" to "service_role";
grant DELETE on public."subscribers" to "service_role";
grant TRUNCATE on public."subscribers" to "service_role";
grant REFERENCES on public."subscribers" to "service_role";
grant TRIGGER on public."subscribers" to "service_role";
grant INSERT on public."mynd_activation_30d" to "anon";
grant SELECT on public."mynd_activation_30d" to "anon";
grant UPDATE on public."mynd_activation_30d" to "anon";
grant DELETE on public."mynd_activation_30d" to "anon";
grant TRUNCATE on public."mynd_activation_30d" to "anon";
grant REFERENCES on public."mynd_activation_30d" to "anon";
grant TRIGGER on public."mynd_activation_30d" to "anon";
grant INSERT on public."mynd_activation_30d" to "authenticated";
grant SELECT on public."mynd_activation_30d" to "authenticated";
grant UPDATE on public."mynd_activation_30d" to "authenticated";
grant DELETE on public."mynd_activation_30d" to "authenticated";
grant TRUNCATE on public."mynd_activation_30d" to "authenticated";
grant REFERENCES on public."mynd_activation_30d" to "authenticated";
grant TRIGGER on public."mynd_activation_30d" to "authenticated";
grant INSERT on public."mynd_activation_30d" to "service_role";
grant SELECT on public."mynd_activation_30d" to "service_role";
grant UPDATE on public."mynd_activation_30d" to "service_role";
grant DELETE on public."mynd_activation_30d" to "service_role";
grant TRUNCATE on public."mynd_activation_30d" to "service_role";
grant REFERENCES on public."mynd_activation_30d" to "service_role";
grant TRIGGER on public."mynd_activation_30d" to "service_role";
grant INSERT on public."kpi_guided_completion_rate_weekly" to "anon";
grant SELECT on public."kpi_guided_completion_rate_weekly" to "anon";
grant UPDATE on public."kpi_guided_completion_rate_weekly" to "anon";
grant DELETE on public."kpi_guided_completion_rate_weekly" to "anon";
grant TRUNCATE on public."kpi_guided_completion_rate_weekly" to "anon";
grant REFERENCES on public."kpi_guided_completion_rate_weekly" to "anon";
grant TRIGGER on public."kpi_guided_completion_rate_weekly" to "anon";
grant INSERT on public."kpi_guided_completion_rate_weekly" to "authenticated";
grant SELECT on public."kpi_guided_completion_rate_weekly" to "authenticated";
grant UPDATE on public."kpi_guided_completion_rate_weekly" to "authenticated";
grant DELETE on public."kpi_guided_completion_rate_weekly" to "authenticated";
grant TRUNCATE on public."kpi_guided_completion_rate_weekly" to "authenticated";
grant REFERENCES on public."kpi_guided_completion_rate_weekly" to "authenticated";
grant TRIGGER on public."kpi_guided_completion_rate_weekly" to "authenticated";
grant INSERT on public."kpi_guided_completion_rate_weekly" to "service_role";
grant SELECT on public."kpi_guided_completion_rate_weekly" to "service_role";
grant UPDATE on public."kpi_guided_completion_rate_weekly" to "service_role";
grant DELETE on public."kpi_guided_completion_rate_weekly" to "service_role";
grant TRUNCATE on public."kpi_guided_completion_rate_weekly" to "service_role";
grant REFERENCES on public."kpi_guided_completion_rate_weekly" to "service_role";
grant TRIGGER on public."kpi_guided_completion_rate_weekly" to "service_role";
grant INSERT on public."kpi_reflection_mix_last_7d" to "anon";
grant SELECT on public."kpi_reflection_mix_last_7d" to "anon";
grant UPDATE on public."kpi_reflection_mix_last_7d" to "anon";
grant DELETE on public."kpi_reflection_mix_last_7d" to "anon";
grant TRUNCATE on public."kpi_reflection_mix_last_7d" to "anon";
grant REFERENCES on public."kpi_reflection_mix_last_7d" to "anon";
grant TRIGGER on public."kpi_reflection_mix_last_7d" to "anon";
grant INSERT on public."kpi_reflection_mix_last_7d" to "authenticated";
grant SELECT on public."kpi_reflection_mix_last_7d" to "authenticated";
grant UPDATE on public."kpi_reflection_mix_last_7d" to "authenticated";
grant DELETE on public."kpi_reflection_mix_last_7d" to "authenticated";
grant TRUNCATE on public."kpi_reflection_mix_last_7d" to "authenticated";
grant REFERENCES on public."kpi_reflection_mix_last_7d" to "authenticated";
grant TRIGGER on public."kpi_reflection_mix_last_7d" to "authenticated";
grant INSERT on public."kpi_reflection_mix_last_7d" to "service_role";
grant SELECT on public."kpi_reflection_mix_last_7d" to "service_role";
grant UPDATE on public."kpi_reflection_mix_last_7d" to "service_role";
grant DELETE on public."kpi_reflection_mix_last_7d" to "service_role";
grant TRUNCATE on public."kpi_reflection_mix_last_7d" to "service_role";
grant REFERENCES on public."kpi_reflection_mix_last_7d" to "service_role";
grant TRIGGER on public."kpi_reflection_mix_last_7d" to "service_role";
grant INSERT on public."therapist_invites" to "anon";
grant SELECT on public."therapist_invites" to "anon";
grant UPDATE on public."therapist_invites" to "anon";
grant DELETE on public."therapist_invites" to "anon";
grant TRUNCATE on public."therapist_invites" to "anon";
grant REFERENCES on public."therapist_invites" to "anon";
grant TRIGGER on public."therapist_invites" to "anon";
grant INSERT on public."therapist_invites" to "authenticated";
grant SELECT on public."therapist_invites" to "authenticated";
grant UPDATE on public."therapist_invites" to "authenticated";
grant DELETE on public."therapist_invites" to "authenticated";
grant TRUNCATE on public."therapist_invites" to "authenticated";
grant REFERENCES on public."therapist_invites" to "authenticated";
grant TRIGGER on public."therapist_invites" to "authenticated";
grant INSERT on public."therapist_invites" to "service_role";
grant SELECT on public."therapist_invites" to "service_role";
grant UPDATE on public."therapist_invites" to "service_role";
grant DELETE on public."therapist_invites" to "service_role";
grant TRUNCATE on public."therapist_invites" to "service_role";
grant REFERENCES on public."therapist_invites" to "service_role";
grant TRIGGER on public."therapist_invites" to "service_role";
grant INSERT on public."therapist_links" to "anon";
grant SELECT on public."therapist_links" to "anon";
grant UPDATE on public."therapist_links" to "anon";
grant DELETE on public."therapist_links" to "anon";
grant TRUNCATE on public."therapist_links" to "anon";
grant REFERENCES on public."therapist_links" to "anon";
grant TRIGGER on public."therapist_links" to "anon";
grant INSERT on public."therapist_links" to "authenticated";
grant SELECT on public."therapist_links" to "authenticated";
grant UPDATE on public."therapist_links" to "authenticated";
grant DELETE on public."therapist_links" to "authenticated";
grant TRUNCATE on public."therapist_links" to "authenticated";
grant REFERENCES on public."therapist_links" to "authenticated";
grant TRIGGER on public."therapist_links" to "authenticated";
grant INSERT on public."therapist_links" to "service_role";
grant SELECT on public."therapist_links" to "service_role";
grant UPDATE on public."therapist_links" to "service_role";
grant DELETE on public."therapist_links" to "service_role";
grant TRUNCATE on public."therapist_links" to "service_role";
grant REFERENCES on public."therapist_links" to "service_role";
grant TRIGGER on public."therapist_links" to "service_role";
grant INSERT on public."agent_ritual_events" to "anon";
grant SELECT on public."agent_ritual_events" to "anon";
grant UPDATE on public."agent_ritual_events" to "anon";
grant DELETE on public."agent_ritual_events" to "anon";
grant TRUNCATE on public."agent_ritual_events" to "anon";
grant REFERENCES on public."agent_ritual_events" to "anon";
grant TRIGGER on public."agent_ritual_events" to "anon";
grant INSERT on public."agent_ritual_events" to "authenticated";
grant SELECT on public."agent_ritual_events" to "authenticated";
grant UPDATE on public."agent_ritual_events" to "authenticated";
grant DELETE on public."agent_ritual_events" to "authenticated";
grant TRUNCATE on public."agent_ritual_events" to "authenticated";
grant REFERENCES on public."agent_ritual_events" to "authenticated";
grant TRIGGER on public."agent_ritual_events" to "authenticated";
grant INSERT on public."agent_ritual_events" to "service_role";
grant SELECT on public."agent_ritual_events" to "service_role";
grant UPDATE on public."agent_ritual_events" to "service_role";
grant DELETE on public."agent_ritual_events" to "service_role";
grant TRUNCATE on public."agent_ritual_events" to "service_role";
grant REFERENCES on public."agent_ritual_events" to "service_role";
grant TRIGGER on public."agent_ritual_events" to "service_role";
grant INSERT on public."user_flags" to "anon";
grant SELECT on public."user_flags" to "anon";
grant UPDATE on public."user_flags" to "anon";
grant DELETE on public."user_flags" to "anon";
grant TRUNCATE on public."user_flags" to "anon";
grant REFERENCES on public."user_flags" to "anon";
grant TRIGGER on public."user_flags" to "anon";
grant INSERT on public."user_flags" to "authenticated";
grant SELECT on public."user_flags" to "authenticated";
grant UPDATE on public."user_flags" to "authenticated";
grant DELETE on public."user_flags" to "authenticated";
grant TRUNCATE on public."user_flags" to "authenticated";
grant REFERENCES on public."user_flags" to "authenticated";
grant TRIGGER on public."user_flags" to "authenticated";
grant INSERT on public."user_flags" to "service_role";
grant SELECT on public."user_flags" to "service_role";
grant UPDATE on public."user_flags" to "service_role";
grant DELETE on public."user_flags" to "service_role";
grant TRUNCATE on public."user_flags" to "service_role";
grant REFERENCES on public."user_flags" to "service_role";
grant TRIGGER on public."user_flags" to "service_role";
grant INSERT on public."mynd_reflections_7d" to "anon";
grant SELECT on public."mynd_reflections_7d" to "anon";
grant UPDATE on public."mynd_reflections_7d" to "anon";
grant DELETE on public."mynd_reflections_7d" to "anon";
grant TRUNCATE on public."mynd_reflections_7d" to "anon";
grant REFERENCES on public."mynd_reflections_7d" to "anon";
grant TRIGGER on public."mynd_reflections_7d" to "anon";
grant INSERT on public."mynd_reflections_7d" to "authenticated";
grant SELECT on public."mynd_reflections_7d" to "authenticated";
grant UPDATE on public."mynd_reflections_7d" to "authenticated";
grant DELETE on public."mynd_reflections_7d" to "authenticated";
grant TRUNCATE on public."mynd_reflections_7d" to "authenticated";
grant REFERENCES on public."mynd_reflections_7d" to "authenticated";
grant TRIGGER on public."mynd_reflections_7d" to "authenticated";
grant INSERT on public."mynd_reflections_7d" to "service_role";
grant SELECT on public."mynd_reflections_7d" to "service_role";
grant UPDATE on public."mynd_reflections_7d" to "service_role";
grant DELETE on public."mynd_reflections_7d" to "service_role";
grant TRUNCATE on public."mynd_reflections_7d" to "service_role";
grant REFERENCES on public."mynd_reflections_7d" to "service_role";
grant TRIGGER on public."mynd_reflections_7d" to "service_role";
grant INSERT on public."weekly_email_log" to "anon";
grant SELECT on public."weekly_email_log" to "anon";
grant UPDATE on public."weekly_email_log" to "anon";
grant DELETE on public."weekly_email_log" to "anon";
grant TRUNCATE on public."weekly_email_log" to "anon";
grant REFERENCES on public."weekly_email_log" to "anon";
grant TRIGGER on public."weekly_email_log" to "anon";
grant INSERT on public."weekly_email_log" to "authenticated";
grant SELECT on public."weekly_email_log" to "authenticated";
grant UPDATE on public."weekly_email_log" to "authenticated";
grant DELETE on public."weekly_email_log" to "authenticated";
grant TRUNCATE on public."weekly_email_log" to "authenticated";
grant REFERENCES on public."weekly_email_log" to "authenticated";
grant TRIGGER on public."weekly_email_log" to "authenticated";
grant INSERT on public."weekly_email_log" to "service_role";
grant SELECT on public."weekly_email_log" to "service_role";
grant UPDATE on public."weekly_email_log" to "service_role";
grant DELETE on public."weekly_email_log" to "service_role";
grant TRUNCATE on public."weekly_email_log" to "service_role";
grant REFERENCES on public."weekly_email_log" to "service_role";
grant TRIGGER on public."weekly_email_log" to "service_role";
grant INSERT on public."v_emotion_mirror_last_7d" to "anon";
grant SELECT on public."v_emotion_mirror_last_7d" to "anon";
grant UPDATE on public."v_emotion_mirror_last_7d" to "anon";
grant DELETE on public."v_emotion_mirror_last_7d" to "anon";
grant TRUNCATE on public."v_emotion_mirror_last_7d" to "anon";
grant REFERENCES on public."v_emotion_mirror_last_7d" to "anon";
grant TRIGGER on public."v_emotion_mirror_last_7d" to "anon";
grant INSERT on public."v_emotion_mirror_last_7d" to "authenticated";
grant SELECT on public."v_emotion_mirror_last_7d" to "authenticated";
grant UPDATE on public."v_emotion_mirror_last_7d" to "authenticated";
grant DELETE on public."v_emotion_mirror_last_7d" to "authenticated";
grant TRUNCATE on public."v_emotion_mirror_last_7d" to "authenticated";
grant REFERENCES on public."v_emotion_mirror_last_7d" to "authenticated";
grant TRIGGER on public."v_emotion_mirror_last_7d" to "authenticated";
grant INSERT on public."v_emotion_mirror_last_7d" to "service_role";
grant SELECT on public."v_emotion_mirror_last_7d" to "service_role";
grant UPDATE on public."v_emotion_mirror_last_7d" to "service_role";
grant DELETE on public."v_emotion_mirror_last_7d" to "service_role";
grant TRUNCATE on public."v_emotion_mirror_last_7d" to "service_role";
grant REFERENCES on public."v_emotion_mirror_last_7d" to "service_role";
grant TRIGGER on public."v_emotion_mirror_last_7d" to "service_role";
grant INSERT on public."v_ritual_checkins_day_index" to "anon";
grant SELECT on public."v_ritual_checkins_day_index" to "anon";
grant UPDATE on public."v_ritual_checkins_day_index" to "anon";
grant DELETE on public."v_ritual_checkins_day_index" to "anon";
grant TRUNCATE on public."v_ritual_checkins_day_index" to "anon";
grant REFERENCES on public."v_ritual_checkins_day_index" to "anon";
grant TRIGGER on public."v_ritual_checkins_day_index" to "anon";
grant INSERT on public."v_ritual_checkins_day_index" to "authenticated";
grant SELECT on public."v_ritual_checkins_day_index" to "authenticated";
grant UPDATE on public."v_ritual_checkins_day_index" to "authenticated";
grant DELETE on public."v_ritual_checkins_day_index" to "authenticated";
grant TRUNCATE on public."v_ritual_checkins_day_index" to "authenticated";
grant REFERENCES on public."v_ritual_checkins_day_index" to "authenticated";
grant TRIGGER on public."v_ritual_checkins_day_index" to "authenticated";
grant INSERT on public."v_ritual_checkins_day_index" to "service_role";
grant SELECT on public."v_ritual_checkins_day_index" to "service_role";
grant UPDATE on public."v_ritual_checkins_day_index" to "service_role";
grant DELETE on public."v_ritual_checkins_day_index" to "service_role";
grant TRUNCATE on public."v_ritual_checkins_day_index" to "service_role";
grant REFERENCES on public."v_ritual_checkins_day_index" to "service_role";
grant TRIGGER on public."v_ritual_checkins_day_index" to "service_role";
grant INSERT on public."kpi_reflection_days_last_7d" to "anon";
grant SELECT on public."kpi_reflection_days_last_7d" to "anon";
grant UPDATE on public."kpi_reflection_days_last_7d" to "anon";
grant DELETE on public."kpi_reflection_days_last_7d" to "anon";
grant TRUNCATE on public."kpi_reflection_days_last_7d" to "anon";
grant REFERENCES on public."kpi_reflection_days_last_7d" to "anon";
grant TRIGGER on public."kpi_reflection_days_last_7d" to "anon";
grant INSERT on public."kpi_reflection_days_last_7d" to "authenticated";
grant SELECT on public."kpi_reflection_days_last_7d" to "authenticated";
grant UPDATE on public."kpi_reflection_days_last_7d" to "authenticated";
grant DELETE on public."kpi_reflection_days_last_7d" to "authenticated";
grant TRUNCATE on public."kpi_reflection_days_last_7d" to "authenticated";
grant REFERENCES on public."kpi_reflection_days_last_7d" to "authenticated";
grant TRIGGER on public."kpi_reflection_days_last_7d" to "authenticated";
grant INSERT on public."kpi_reflection_days_last_7d" to "service_role";
grant SELECT on public."kpi_reflection_days_last_7d" to "service_role";
grant UPDATE on public."kpi_reflection_days_last_7d" to "service_role";
grant DELETE on public."kpi_reflection_days_last_7d" to "service_role";
grant TRUNCATE on public."kpi_reflection_days_last_7d" to "service_role";
grant REFERENCES on public."kpi_reflection_days_last_7d" to "service_role";
grant TRIGGER on public."kpi_reflection_days_last_7d" to "service_role";
grant INSERT on public."v_mood_calendar" to "anon";
grant SELECT on public."v_mood_calendar" to "anon";
grant UPDATE on public."v_mood_calendar" to "anon";
grant DELETE on public."v_mood_calendar" to "anon";
grant TRUNCATE on public."v_mood_calendar" to "anon";
grant REFERENCES on public."v_mood_calendar" to "anon";
grant TRIGGER on public."v_mood_calendar" to "anon";
grant INSERT on public."v_mood_calendar" to "authenticated";
grant SELECT on public."v_mood_calendar" to "authenticated";
grant UPDATE on public."v_mood_calendar" to "authenticated";
grant DELETE on public."v_mood_calendar" to "authenticated";
grant TRUNCATE on public."v_mood_calendar" to "authenticated";
grant REFERENCES on public."v_mood_calendar" to "authenticated";
grant TRIGGER on public."v_mood_calendar" to "authenticated";
grant INSERT on public."v_mood_calendar" to "service_role";
grant SELECT on public."v_mood_calendar" to "service_role";
grant UPDATE on public."v_mood_calendar" to "service_role";
grant DELETE on public."v_mood_calendar" to "service_role";
grant TRUNCATE on public."v_mood_calendar" to "service_role";
grant REFERENCES on public."v_mood_calendar" to "service_role";
grant TRIGGER on public."v_mood_calendar" to "service_role";
grant INSERT on public."v_emotion_frequency_last_7d" to "anon";
grant SELECT on public."v_emotion_frequency_last_7d" to "anon";
grant UPDATE on public."v_emotion_frequency_last_7d" to "anon";
grant DELETE on public."v_emotion_frequency_last_7d" to "anon";
grant TRUNCATE on public."v_emotion_frequency_last_7d" to "anon";
grant REFERENCES on public."v_emotion_frequency_last_7d" to "anon";
grant TRIGGER on public."v_emotion_frequency_last_7d" to "anon";
grant INSERT on public."v_emotion_frequency_last_7d" to "authenticated";
grant SELECT on public."v_emotion_frequency_last_7d" to "authenticated";
grant UPDATE on public."v_emotion_frequency_last_7d" to "authenticated";
grant DELETE on public."v_emotion_frequency_last_7d" to "authenticated";
grant TRUNCATE on public."v_emotion_frequency_last_7d" to "authenticated";
grant REFERENCES on public."v_emotion_frequency_last_7d" to "authenticated";
grant TRIGGER on public."v_emotion_frequency_last_7d" to "authenticated";
grant INSERT on public."v_emotion_frequency_last_7d" to "service_role";
grant SELECT on public."v_emotion_frequency_last_7d" to "service_role";
grant UPDATE on public."v_emotion_frequency_last_7d" to "service_role";
grant DELETE on public."v_emotion_frequency_last_7d" to "service_role";
grant TRUNCATE on public."v_emotion_frequency_last_7d" to "service_role";
grant REFERENCES on public."v_emotion_frequency_last_7d" to "service_role";
grant TRIGGER on public."v_emotion_frequency_last_7d" to "service_role";
grant INSERT on public."therapist_shares" to "anon";
grant SELECT on public."therapist_shares" to "anon";
grant UPDATE on public."therapist_shares" to "anon";
grant DELETE on public."therapist_shares" to "anon";
grant TRUNCATE on public."therapist_shares" to "anon";
grant REFERENCES on public."therapist_shares" to "anon";
grant TRIGGER on public."therapist_shares" to "anon";
grant INSERT on public."therapist_shares" to "authenticated";
grant SELECT on public."therapist_shares" to "authenticated";
grant UPDATE on public."therapist_shares" to "authenticated";
grant DELETE on public."therapist_shares" to "authenticated";
grant TRUNCATE on public."therapist_shares" to "authenticated";
grant REFERENCES on public."therapist_shares" to "authenticated";
grant TRIGGER on public."therapist_shares" to "authenticated";
grant INSERT on public."therapist_shares" to "service_role";
grant SELECT on public."therapist_shares" to "service_role";
grant UPDATE on public."therapist_shares" to "service_role";
grant DELETE on public."therapist_shares" to "service_role";
grant TRUNCATE on public."therapist_shares" to "service_role";
grant REFERENCES on public."therapist_shares" to "service_role";
grant TRIGGER on public."therapist_shares" to "service_role";
grant INSERT on public."v_reflection_events" to "anon";
grant SELECT on public."v_reflection_events" to "anon";
grant UPDATE on public."v_reflection_events" to "anon";
grant DELETE on public."v_reflection_events" to "anon";
grant TRUNCATE on public."v_reflection_events" to "anon";
grant REFERENCES on public."v_reflection_events" to "anon";
grant TRIGGER on public."v_reflection_events" to "anon";
grant INSERT on public."v_reflection_events" to "authenticated";
grant SELECT on public."v_reflection_events" to "authenticated";
grant UPDATE on public."v_reflection_events" to "authenticated";
grant DELETE on public."v_reflection_events" to "authenticated";
grant TRUNCATE on public."v_reflection_events" to "authenticated";
grant REFERENCES on public."v_reflection_events" to "authenticated";
grant TRIGGER on public."v_reflection_events" to "authenticated";
grant INSERT on public."v_reflection_events" to "service_role";
grant SELECT on public."v_reflection_events" to "service_role";
grant UPDATE on public."v_reflection_events" to "service_role";
grant DELETE on public."v_reflection_events" to "service_role";
grant TRUNCATE on public."v_reflection_events" to "service_role";
grant REFERENCES on public."v_reflection_events" to "service_role";
grant TRIGGER on public."v_reflection_events" to "service_role";
grant INSERT on public."mood_summaries" to "anon";
grant SELECT on public."mood_summaries" to "anon";
grant UPDATE on public."mood_summaries" to "anon";
grant DELETE on public."mood_summaries" to "anon";
grant TRUNCATE on public."mood_summaries" to "anon";
grant REFERENCES on public."mood_summaries" to "anon";
grant TRIGGER on public."mood_summaries" to "anon";
grant INSERT on public."mood_summaries" to "authenticated";
grant SELECT on public."mood_summaries" to "authenticated";
grant UPDATE on public."mood_summaries" to "authenticated";
grant DELETE on public."mood_summaries" to "authenticated";
grant TRUNCATE on public."mood_summaries" to "authenticated";
grant REFERENCES on public."mood_summaries" to "authenticated";
grant TRIGGER on public."mood_summaries" to "authenticated";
grant INSERT on public."mood_summaries" to "service_role";
grant SELECT on public."mood_summaries" to "service_role";
grant UPDATE on public."mood_summaries" to "service_role";
grant DELETE on public."mood_summaries" to "service_role";
grant TRUNCATE on public."mood_summaries" to "service_role";
grant REFERENCES on public."mood_summaries" to "service_role";
grant TRIGGER on public."mood_summaries" to "service_role";
grant INSERT on public."mynd_wrr_by_week" to "anon";
grant SELECT on public."mynd_wrr_by_week" to "anon";
grant UPDATE on public."mynd_wrr_by_week" to "anon";
grant DELETE on public."mynd_wrr_by_week" to "anon";
grant TRUNCATE on public."mynd_wrr_by_week" to "anon";
grant REFERENCES on public."mynd_wrr_by_week" to "anon";
grant TRIGGER on public."mynd_wrr_by_week" to "anon";
grant INSERT on public."mynd_wrr_by_week" to "authenticated";
grant SELECT on public."mynd_wrr_by_week" to "authenticated";
grant UPDATE on public."mynd_wrr_by_week" to "authenticated";
grant DELETE on public."mynd_wrr_by_week" to "authenticated";
grant TRUNCATE on public."mynd_wrr_by_week" to "authenticated";
grant REFERENCES on public."mynd_wrr_by_week" to "authenticated";
grant TRIGGER on public."mynd_wrr_by_week" to "authenticated";
grant INSERT on public."mynd_wrr_by_week" to "service_role";
grant SELECT on public."mynd_wrr_by_week" to "service_role";
grant UPDATE on public."mynd_wrr_by_week" to "service_role";
grant DELETE on public."mynd_wrr_by_week" to "service_role";
grant TRUNCATE on public."mynd_wrr_by_week" to "service_role";
grant REFERENCES on public."mynd_wrr_by_week" to "service_role";
grant TRIGGER on public."mynd_wrr_by_week" to "service_role";
grant INSERT on public."guided_history" to "anon";
grant SELECT on public."guided_history" to "anon";
grant UPDATE on public."guided_history" to "anon";
grant DELETE on public."guided_history" to "anon";
grant TRUNCATE on public."guided_history" to "anon";
grant REFERENCES on public."guided_history" to "anon";
grant TRIGGER on public."guided_history" to "anon";
grant INSERT on public."guided_history" to "authenticated";
grant SELECT on public."guided_history" to "authenticated";
grant UPDATE on public."guided_history" to "authenticated";
grant DELETE on public."guided_history" to "authenticated";
grant TRUNCATE on public."guided_history" to "authenticated";
grant REFERENCES on public."guided_history" to "authenticated";
grant TRIGGER on public."guided_history" to "authenticated";
grant INSERT on public."guided_history" to "service_role";
grant SELECT on public."guided_history" to "service_role";
grant UPDATE on public."guided_history" to "service_role";
grant DELETE on public."guided_history" to "service_role";
grant TRUNCATE on public."guided_history" to "service_role";
grant REFERENCES on public."guided_history" to "service_role";
grant TRIGGER on public."guided_history" to "service_role";
grant INSERT on public."v_ritual_7d_adherence" to "anon";
grant SELECT on public."v_ritual_7d_adherence" to "anon";
grant UPDATE on public."v_ritual_7d_adherence" to "anon";
grant DELETE on public."v_ritual_7d_adherence" to "anon";
grant TRUNCATE on public."v_ritual_7d_adherence" to "anon";
grant REFERENCES on public."v_ritual_7d_adherence" to "anon";
grant TRIGGER on public."v_ritual_7d_adherence" to "anon";
grant INSERT on public."v_ritual_7d_adherence" to "authenticated";
grant SELECT on public."v_ritual_7d_adherence" to "authenticated";
grant UPDATE on public."v_ritual_7d_adherence" to "authenticated";
grant DELETE on public."v_ritual_7d_adherence" to "authenticated";
grant TRUNCATE on public."v_ritual_7d_adherence" to "authenticated";
grant REFERENCES on public."v_ritual_7d_adherence" to "authenticated";
grant TRIGGER on public."v_ritual_7d_adherence" to "authenticated";
grant INSERT on public."v_ritual_7d_adherence" to "service_role";
grant SELECT on public."v_ritual_7d_adherence" to "service_role";
grant UPDATE on public."v_ritual_7d_adherence" to "service_role";
grant DELETE on public."v_ritual_7d_adherence" to "service_role";
grant TRUNCATE on public."v_ritual_7d_adherence" to "service_role";
grant REFERENCES on public."v_ritual_7d_adherence" to "service_role";
grant TRIGGER on public."v_ritual_7d_adherence" to "service_role";
grant INSERT on public."mynd_emotional_breadth_7d" to "anon";
grant SELECT on public."mynd_emotional_breadth_7d" to "anon";
grant UPDATE on public."mynd_emotional_breadth_7d" to "anon";
grant DELETE on public."mynd_emotional_breadth_7d" to "anon";
grant TRUNCATE on public."mynd_emotional_breadth_7d" to "anon";
grant REFERENCES on public."mynd_emotional_breadth_7d" to "anon";
grant TRIGGER on public."mynd_emotional_breadth_7d" to "anon";
grant INSERT on public."mynd_emotional_breadth_7d" to "authenticated";
grant SELECT on public."mynd_emotional_breadth_7d" to "authenticated";
grant UPDATE on public."mynd_emotional_breadth_7d" to "authenticated";
grant DELETE on public."mynd_emotional_breadth_7d" to "authenticated";
grant TRUNCATE on public."mynd_emotional_breadth_7d" to "authenticated";
grant REFERENCES on public."mynd_emotional_breadth_7d" to "authenticated";
grant TRIGGER on public."mynd_emotional_breadth_7d" to "authenticated";
grant INSERT on public."mynd_emotional_breadth_7d" to "service_role";
grant SELECT on public."mynd_emotional_breadth_7d" to "service_role";
grant UPDATE on public."mynd_emotional_breadth_7d" to "service_role";
grant DELETE on public."mynd_emotional_breadth_7d" to "service_role";
grant TRUNCATE on public."mynd_emotional_breadth_7d" to "service_role";
grant REFERENCES on public."mynd_emotional_breadth_7d" to "service_role";
grant TRIGGER on public."mynd_emotional_breadth_7d" to "service_role";
grant INSERT on public."kpi_time_to_first_reflection" to "anon";
grant SELECT on public."kpi_time_to_first_reflection" to "anon";
grant UPDATE on public."kpi_time_to_first_reflection" to "anon";
grant DELETE on public."kpi_time_to_first_reflection" to "anon";
grant TRUNCATE on public."kpi_time_to_first_reflection" to "anon";
grant REFERENCES on public."kpi_time_to_first_reflection" to "anon";
grant TRIGGER on public."kpi_time_to_first_reflection" to "anon";
grant INSERT on public."kpi_time_to_first_reflection" to "authenticated";
grant SELECT on public."kpi_time_to_first_reflection" to "authenticated";
grant UPDATE on public."kpi_time_to_first_reflection" to "authenticated";
grant DELETE on public."kpi_time_to_first_reflection" to "authenticated";
grant TRUNCATE on public."kpi_time_to_first_reflection" to "authenticated";
grant REFERENCES on public."kpi_time_to_first_reflection" to "authenticated";
grant TRIGGER on public."kpi_time_to_first_reflection" to "authenticated";
grant INSERT on public."kpi_time_to_first_reflection" to "service_role";
grant SELECT on public."kpi_time_to_first_reflection" to "service_role";
grant UPDATE on public."kpi_time_to_first_reflection" to "service_role";
grant DELETE on public."kpi_time_to_first_reflection" to "service_role";
grant TRUNCATE on public."kpi_time_to_first_reflection" to "service_role";
grant REFERENCES on public."kpi_time_to_first_reflection" to "service_role";
grant TRIGGER on public."kpi_time_to_first_reflection" to "service_role";
grant INSERT on public."v_emotion_tags" to "anon";
grant SELECT on public."v_emotion_tags" to "anon";
grant UPDATE on public."v_emotion_tags" to "anon";
grant DELETE on public."v_emotion_tags" to "anon";
grant TRUNCATE on public."v_emotion_tags" to "anon";
grant REFERENCES on public."v_emotion_tags" to "anon";
grant TRIGGER on public."v_emotion_tags" to "anon";
grant INSERT on public."v_emotion_tags" to "authenticated";
grant SELECT on public."v_emotion_tags" to "authenticated";
grant UPDATE on public."v_emotion_tags" to "authenticated";
grant DELETE on public."v_emotion_tags" to "authenticated";
grant TRUNCATE on public."v_emotion_tags" to "authenticated";
grant REFERENCES on public."v_emotion_tags" to "authenticated";
grant TRIGGER on public."v_emotion_tags" to "authenticated";
grant INSERT on public."v_emotion_tags" to "service_role";
grant SELECT on public."v_emotion_tags" to "service_role";
grant UPDATE on public."v_emotion_tags" to "service_role";
grant DELETE on public."v_emotion_tags" to "service_role";
grant TRUNCATE on public."v_emotion_tags" to "service_role";
grant REFERENCES on public."v_emotion_tags" to "service_role";
grant TRIGGER on public."v_emotion_tags" to "service_role";
grant INSERT on public."kpi_reflection_days_last_7d_distribution" to "anon";
grant SELECT on public."kpi_reflection_days_last_7d_distribution" to "anon";
grant UPDATE on public."kpi_reflection_days_last_7d_distribution" to "anon";
grant DELETE on public."kpi_reflection_days_last_7d_distribution" to "anon";
grant TRUNCATE on public."kpi_reflection_days_last_7d_distribution" to "anon";
grant REFERENCES on public."kpi_reflection_days_last_7d_distribution" to "anon";
grant TRIGGER on public."kpi_reflection_days_last_7d_distribution" to "anon";
grant INSERT on public."kpi_reflection_days_last_7d_distribution" to "authenticated";
grant SELECT on public."kpi_reflection_days_last_7d_distribution" to "authenticated";
grant UPDATE on public."kpi_reflection_days_last_7d_distribution" to "authenticated";
grant DELETE on public."kpi_reflection_days_last_7d_distribution" to "authenticated";
grant TRUNCATE on public."kpi_reflection_days_last_7d_distribution" to "authenticated";
grant REFERENCES on public."kpi_reflection_days_last_7d_distribution" to "authenticated";
grant TRIGGER on public."kpi_reflection_days_last_7d_distribution" to "authenticated";
grant INSERT on public."kpi_reflection_days_last_7d_distribution" to "service_role";
grant SELECT on public."kpi_reflection_days_last_7d_distribution" to "service_role";
grant UPDATE on public."kpi_reflection_days_last_7d_distribution" to "service_role";
grant DELETE on public."kpi_reflection_days_last_7d_distribution" to "service_role";
grant TRUNCATE on public."kpi_reflection_days_last_7d_distribution" to "service_role";
grant REFERENCES on public."kpi_reflection_days_last_7d_distribution" to "service_role";
grant TRIGGER on public."kpi_reflection_days_last_7d_distribution" to "service_role";
grant INSERT on public."chat_sessions" to "anon";
grant SELECT on public."chat_sessions" to "anon";
grant UPDATE on public."chat_sessions" to "anon";
grant DELETE on public."chat_sessions" to "anon";
grant TRUNCATE on public."chat_sessions" to "anon";
grant REFERENCES on public."chat_sessions" to "anon";
grant TRIGGER on public."chat_sessions" to "anon";
grant INSERT on public."chat_sessions" to "authenticated";
grant SELECT on public."chat_sessions" to "authenticated";
grant UPDATE on public."chat_sessions" to "authenticated";
grant DELETE on public."chat_sessions" to "authenticated";
grant TRUNCATE on public."chat_sessions" to "authenticated";
grant REFERENCES on public."chat_sessions" to "authenticated";
grant TRIGGER on public."chat_sessions" to "authenticated";
grant INSERT on public."chat_sessions" to "service_role";
grant SELECT on public."chat_sessions" to "service_role";
grant UPDATE on public."chat_sessions" to "service_role";
grant DELETE on public."chat_sessions" to "service_role";
grant TRUNCATE on public."chat_sessions" to "service_role";
grant REFERENCES on public."chat_sessions" to "service_role";
grant TRIGGER on public."chat_sessions" to "service_role";

alter view public."v_mood_daily" set (security_invoker=on);
alter view public."v_ritual_7d_completion_per_user" set (security_invoker=on);
alter view public."v_ritual_7d_completion_summary" set (security_invoker=on);
alter view public."mynd_activation_30d" set (security_invoker=on);
alter view public."kpi_guided_completion_rate_weekly" set (security_invoker=on);
alter view public."kpi_reflection_mix_last_7d" set (security_invoker=on);
alter view public."mynd_reflections_7d" set (security_invoker=on);
alter view public."v_emotion_mirror_last_7d" set (security_invoker=on);
alter view public."v_ritual_checkins_day_index" set (security_invoker=on);
alter view public."kpi_reflection_days_last_7d" set (security_invoker=on);
alter view public."v_mood_calendar" set (security_invoker=on);
alter view public."v_emotion_frequency_last_7d" set (security_invoker=on);
alter view public."v_reflection_events" set (security_invoker=on);
alter view public."mynd_wrr_by_week" set (security_invoker=on);
alter view public."v_ritual_7d_adherence" set (security_invoker=on);
alter view public."mynd_emotional_breadth_7d" set (security_invoker=on);
alter view public."kpi_time_to_first_reflection" set (security_invoker=on);
alter view public."v_emotion_tags" set (security_invoker=on);
alter view public."kpi_reflection_days_last_7d_distribution" set (security_invoker=on);
commit;
