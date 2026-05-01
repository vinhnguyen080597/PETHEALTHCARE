create extension if not exists "pgcrypto";

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  species text not null,
  breed text,
  age integer,
  avatar_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pets_user_id on public.pets(user_id);
create index if not exists idx_pets_created_at on public.pets(created_at desc);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pet_id uuid not null references public.pets(id) on delete cascade,
  diagnosis text not null,
  severity text not null,
  symptoms jsonb not null default '[]'::jsonb,
  treatment text not null,
  confidence double precision not null default 0,
  disclaimer text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analyses_user_pet on public.analyses(user_id, pet_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);
