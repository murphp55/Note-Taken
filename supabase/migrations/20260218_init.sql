create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.folders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  folder_id uuid references public.folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

create table if not exists public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_notes_user_updated on public.notes (user_id, updated_at desc);
create index if not exists idx_folders_user on public.folders (user_id);
create index if not exists idx_tags_user on public.tags (user_id);

alter table public.users enable row level security;
alter table public.notes enable row level security;
alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.api_keys enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users for select using (auth.uid() = id);

drop policy if exists "notes_own_data" on public.notes;
create policy "notes_own_data" on public.notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "folders_own_data" on public.folders;
create policy "folders_own_data" on public.folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tags_own_data" on public.tags;
create policy "tags_own_data" on public.tags
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "note_tags_own_data" on public.note_tags;
create policy "note_tags_own_data" on public.note_tags
  for all
  using (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

drop policy if exists "api_keys_own_data" on public.api_keys;
create policy "api_keys_own_data" on public.api_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.folders;
alter publication supabase_realtime add table public.tags;
alter publication supabase_realtime add table public.note_tags;
