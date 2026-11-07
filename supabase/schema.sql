-- Granny Recipes schema, row level security, storage, and rate limits.
-- Run this once in the Supabase SQL editor for a new project.
-- Then create an account on the site and add yourself as owner:
--   insert into public.owners (user_id)
--   select id from auth.users where email = 'you@example.com';

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'Cook',
  title text not null check (char_length(title) between 3 and 120),
  story text not null default '' check (char_length(story) <= 2000),
  photo_url text,
  photo_credit text,
  photo_is_illustration boolean not null default false,
  prep_minutes integer not null check (prep_minutes between 0 and 1440),
  cook_minutes integer not null check (cook_minutes between 0 and 1440),
  servings integer not null check (servings between 1 and 100),
  category text not null check (category in ('Breakfast', 'Mains', 'Sides', 'Soups', 'Breads', 'Desserts', 'Holidays')),
  ingredients jsonb not null,
  steps jsonb not null,
  hidden boolean not null default false,
  sample boolean not null default false,
  created_at timestamptz not null default now(),
  constraint recipes_time_present check (prep_minutes + cook_minutes > 0),
  constraint recipes_ingredients_array check (jsonb_typeof(ingredients) = 'array'),
  constraint recipes_steps_array check (jsonb_typeof(steps) = 'array')
);

create table if not exists public.recipe_flags (
  slug text primary key,
  hidden boolean not null default false,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_slug text not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default 'Cook',
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.hearts (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_slug)
);

create table if not exists public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_slug text not null,
  stars integer not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_slug)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reporter_name text not null default 'Cook',
  target_type text not null check (target_type in ('recipe', 'comment')),
  target_id text not null,
  recipe_slug text not null default '',
  reason text not null check (char_length(reason) between 2 and 80),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists recipes_created_idx on public.recipes (created_at desc);
create index if not exists comments_recipe_idx on public.comments (recipe_slug, created_at);
create index if not exists hearts_slug_idx on public.hearts (recipe_slug);
create index if not exists ratings_slug_idx on public.ratings (recipe_slug);

create or replace function public.am_i_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.owners where user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  clean_name text;
begin
  raw_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Cook');
  clean_name := left(regexp_replace(raw_name, '[^a-zA-Z0-9 ._-]', '', 'g'), 40);
  if clean_name is null or length(btrim(clean_name)) = 0 then
    clean_name := 'Cook';
  end if;
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), clean_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prepare_recipe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  new.author_id := auth.uid();
  new.author_name := coalesce((select display_name from public.profiles where id = auth.uid()), 'Cook');
  new.sample := false;
  new.hidden := false;
  if jsonb_array_length(new.ingredients) < 1 or jsonb_array_length(new.ingredients) > 40 then
    raise exception 'Add between 1 and 40 ingredients';
  end if;
  if jsonb_array_length(new.steps) < 1 or jsonb_array_length(new.steps) > 30 then
    raise exception 'Add between 1 and 30 steps';
  end if;
  select count(*) into recent_count
  from public.recipes
  where author_id = auth.uid()
    and created_at > now() - interval '1 hour';
  if recent_count >= 3 then
    raise exception 'Rate limit exceeded. Please wait and try again.';
  end if;
  return new;
end;
$$;

drop trigger if exists recipes_prepare on public.recipes;
create trigger recipes_prepare
  before insert on public.recipes
  for each row execute function public.prepare_recipe();

create or replace function public.prepare_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  link_hits integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  new.author_id := auth.uid();
  new.author_name := coalesce((select display_name from public.profiles where id = auth.uid()), 'Cook');
  new.hidden := false;
  link_hits := (length(lower(new.body)) - length(replace(lower(new.body), 'http', ''))) / 4;
  if link_hits > 2 then
    raise exception 'Please remove extra links.';
  end if;
  if exists (
    select 1 from public.comments
    where author_id = auth.uid()
      and recipe_slug = new.recipe_slug
      and body = new.body
      and created_at > now() - interval '1 day'
  ) then
    raise exception 'That comment was already posted.';
  end if;
  select count(*) into recent_count
  from public.comments
  where author_id = auth.uid()
    and created_at > now() - interval '10 minutes';
  if recent_count >= 8 then
    raise exception 'Rate limit exceeded. Please wait and try again.';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_prepare on public.comments;
create trigger comments_prepare
  before insert on public.comments
  for each row execute function public.prepare_comment();

create or replace function public.prepare_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  new.reporter_id := auth.uid();
  new.reporter_name := coalesce((select display_name from public.profiles where id = auth.uid()), 'Cook');
  select count(*) into recent_count
  from public.reports
  where reporter_id = auth.uid()
    and created_at > now() - interval '1 hour';
  if recent_count >= 5 then
    raise exception 'Rate limit exceeded. Please wait and try again.';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_prepare on public.reports;
create trigger reports_prepare
  before insert on public.reports
  for each row execute function public.prepare_report();

create or replace function public.recipe_stats()
returns table (
  recipe_slug text,
  heart_count integer,
  rating_avg numeric,
  rating_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with slugs as (
    select hearts.recipe_slug from public.hearts
    union
    select ratings.recipe_slug from public.ratings
  )
  select
    slugs.recipe_slug,
    (select count(*)::integer from public.hearts where hearts.recipe_slug = slugs.recipe_slug) as heart_count,
    (select round(avg(ratings.stars)::numeric, 1) from public.ratings where ratings.recipe_slug = slugs.recipe_slug) as rating_avg,
    (select count(*)::integer from public.ratings where ratings.recipe_slug = slugs.recipe_slug) as rating_count
  from slugs;
$$;

create or replace function public.my_recipe_activity()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return '{"hearts":[],"ratings":[]}'::jsonb;
  end if;
  return jsonb_build_object(
    'hearts', coalesce((select jsonb_agg(recipe_slug) from public.hearts where user_id = uid), '[]'::jsonb),
    'ratings', coalesce((
      select jsonb_agg(jsonb_build_object('slug', recipe_slug, 'stars', stars))
      from public.ratings
      where user_id = uid
    ), '[]'::jsonb)
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.owners enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_flags enable row level security;
alter table public.comments enable row level security;
alter table public.hearts enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.am_i_owner());

drop policy if exists "update own display name" on public.profiles;
create policy "update own display name" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "read recipes" on public.recipes;
create policy "read recipes" on public.recipes
  for select to anon, authenticated
  using (hidden = false or author_id = auth.uid() or public.am_i_owner());

drop policy if exists "insert own recipes" on public.recipes;
create policy "insert own recipes" on public.recipes
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "owner updates recipes" on public.recipes;
create policy "owner updates recipes" on public.recipes
  for update to authenticated
  using (public.am_i_owner())
  with check (public.am_i_owner());

drop policy if exists "author or owner deletes recipes" on public.recipes;
create policy "author or owner deletes recipes" on public.recipes
  for delete to authenticated
  using (author_id = auth.uid() or public.am_i_owner());

drop policy if exists "read flags" on public.recipe_flags;
create policy "read flags" on public.recipe_flags
  for select to anon, authenticated
  using (true);

drop policy if exists "owner inserts flags" on public.recipe_flags;
create policy "owner inserts flags" on public.recipe_flags
  for insert to authenticated
  with check (public.am_i_owner());

drop policy if exists "owner updates flags" on public.recipe_flags;
create policy "owner updates flags" on public.recipe_flags
  for update to authenticated
  using (public.am_i_owner())
  with check (public.am_i_owner());

drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments
  for select to anon, authenticated
  using (hidden = false or author_id = auth.uid() or public.am_i_owner());

drop policy if exists "insert comments" on public.comments;
create policy "insert comments" on public.comments
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "owner hides comments" on public.comments;
create policy "owner hides comments" on public.comments
  for update to authenticated
  using (public.am_i_owner())
  with check (public.am_i_owner());

drop policy if exists "delete own comments" on public.comments;
create policy "delete own comments" on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.am_i_owner());

drop policy if exists "read own hearts" on public.hearts;
create policy "read own hearts" on public.hearts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "insert own hearts" on public.hearts;
create policy "insert own hearts" on public.hearts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "delete own hearts" on public.hearts;
create policy "delete own hearts" on public.hearts
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "read own ratings" on public.ratings;
create policy "read own ratings" on public.ratings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "insert own ratings" on public.ratings;
create policy "insert own ratings" on public.ratings
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "update own ratings" on public.ratings;
create policy "update own ratings" on public.ratings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "insert reports" on public.reports;
create policy "insert reports" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "owner reads reports" on public.reports;
create policy "owner reads reports" on public.reports
  for select to authenticated
  using (public.am_i_owner());

revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, created_at) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select on public.recipes to anon, authenticated;
grant insert, update, delete on public.recipes to authenticated;
grant select on public.recipe_flags to anon, authenticated;
grant insert, update on public.recipe_flags to authenticated;
grant select on public.comments to anon, authenticated;
grant insert, update, delete on public.comments to authenticated;
grant select, insert, delete on public.hearts to authenticated;
grant select, insert, update on public.ratings to authenticated;
grant insert, select on public.reports to authenticated;

grant execute on function public.am_i_owner() to anon, authenticated;
grant execute on function public.recipe_stats() to anon, authenticated;
grant execute on function public.my_recipe_activity() to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read recipe photos" on storage.objects;
create policy "Public read recipe photos" on storage.objects
  for select to public
  using (bucket_id = 'recipe-photos');

drop policy if exists "Upload own recipe photos" on storage.objects;
create policy "Upload own recipe photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
  );

drop policy if exists "Delete own recipe photos" on storage.objects;
create policy "Delete own recipe photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
