-- End-of-talk survey: anyone may answer once per device (unique session+participant);
-- answers are not readable with the public key. survey_count / survey_summary expose totals only.
-- (Applied to the it-pathway-live project on 2026-11-16; see the project's migration history for the exact text.)
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  session text not null check (session ~ '^[A-Za-z0-9_-]{1,40}$'),
  participant text not null check (char_length(participant) between 8 and 64),
  created_at timestamptz not null default now(),
  year text not null check (year in ('1','2','3','4','other')),
  useful smallint not null check (useful between 1 and 5),
  liked text[] not null default '{}' check (cardinality(liked) <= 5 and liked <@ array['ai','japan','exercise','security','program']::text[]),
  interest smallint not null check (interest between 1 and 5),
  change text check (change in ('higher','same','lower')),
  trial text not null check (trial in ('yes','maybe','no')),
  next_topic text check (char_length(next_topic) <= 500),
  comment text check (char_length(comment) <= 1000),
  contact_name text check (char_length(contact_name) <= 100),
  contact text check (char_length(contact) <= 200),
  unique (session, participant)
);
alter table public.survey_responses enable row level security;
create policy "anyone can answer" on public.survey_responses for insert to anon, authenticated with check (true);
revoke select, update, delete on public.survey_responses from anon, authenticated;
grant insert on public.survey_responses to anon, authenticated;
-- functions survey_count(p_session) and survey_summary(p_session): security definer, totals only
