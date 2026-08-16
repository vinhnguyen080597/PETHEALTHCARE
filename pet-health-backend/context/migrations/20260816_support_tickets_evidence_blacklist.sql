-- Support ticket evidence URLs + lookup tokens for live blacklist.

alter table public.support_tickets
  add column if not exists evidence_urls text[] not null default '{}';

alter table public.support_tickets
  add column if not exists lookup_tokens text[] not null default '{}';

create index if not exists idx_support_tickets_lookup_tokens
  on public.support_tickets using gin (lookup_tokens);

create index if not exists idx_support_tickets_scam_reviewed_lookup
  on public.support_tickets (kind, status)
  where kind = 'scam' and status = 'reviewed';
