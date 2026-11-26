-- Optional column addition for expected-question classification in Session 2 (AEONA Mall 4).
-- Note: the Edge Function also stores `_matched_q` inside `category_probs` (jsonb) for backward compatibility.
alter table public.questions
  add column if not exists matched_q text,
  add column if not exists matched_conf real;
