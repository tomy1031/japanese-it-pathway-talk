-- Live questions for the talk: phones submit through the `questions` Edge Function
-- (service role writes); the deck reads with the publishable key and Realtime.
create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  session      text not null check (session ~ '^[A-Za-z0-9_-]{1,40}$'),
  participant  text not null check (char_length(participant) between 8 and 64),
  body         text not null default '' check (char_length(body) <= 500),  -- shown on the dashboard ('' when flagged)
  created_at   timestamptz not null default now(),
  status       text not null default 'pending' check (status in ('pending','done','error')),
  category     text,
  category_conf real,
  category_probs jsonb,
  open_q       real,     -- P(open question)
  depth        real,     -- 0..3: surface detail .. underlying goal
  on_topic     real,     -- P(about the client's app request)
  flagged      boolean not null default false,
  lang         text,
  en           text,
  ja           text,
  engine       text,     -- which classifier answered (decision / fallback)
  error        text
);
create index if not exists questions_session_created on public.questions (session, created_at);
create index if not exists questions_session_participant on public.questions (session, participant);

-- The original text of every question (kept even when it is hidden as inappropriate).
-- RLS on, no policies: only the service role can read it.
create table if not exists public.questions_private (
  id        uuid primary key references public.questions(id) on delete cascade,
  body_raw  text not null check (char_length(body_raw) between 2 and 500)
);

alter table public.questions enable row level security;
alter table public.questions_private enable row level security;

-- Anyone with the publishable key may read the dashboard table. No insert/update/delete
-- policies: only the Edge Function (service role) writes.
drop policy if exists "dashboard can read" on public.questions;
create policy "dashboard can read" on public.questions for select to anon, authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.questions;
exception when duplicate_object then null; end $$;
