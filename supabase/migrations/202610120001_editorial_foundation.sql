-- Bliss Media editorial foundation. Apply once with Supabase CLI migrations.
-- Demo seed data lives in supabase/seed.dev.sql and is not part of this migration.
begin;

create type public.app_role as enum ('author', 'editor', 'administrator');
create type public.publication_status as enum (
  'draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'archived'
);

-- Keep privileged helper functions outside PostgREST's exposed public schema.
create schema bliss_private authorization postgres;
revoke all on schema bliss_private from public, anon, authenticated;
grant usage on schema bliss_private to anon, authenticated, service_role;
alter default privileges in schema bliss_private revoke execute on functions from public;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Bliss member' check (char_length(btrim(display_name)) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  role public.app_role not null default 'author',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 220),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null default '' check (char_length(excerpt) <= 600),
  body jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
    check (jsonb_typeof(body) = 'object' and body->>'type' = 'doc'),
  cover_image_path text,
  author_profile_id uuid not null references public.profiles(user_id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  status public.publication_status not null default 'draft',
  seo_title text check (seo_title is null or char_length(seo_title) <= 220),
  seo_description text check (seo_description is null or char_length(seo_description) <= 320),
  scheduled_for timestamptz,
  published_at timestamptz,
  last_change_note text check (last_change_note is null or char_length(last_change_note) <= 500),
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_articles_need_a_time check (status <> 'scheduled' or scheduled_for is not null),
  constraint scheduled_time_only_for_scheduled check (status = 'scheduled' or scheduled_for is null),
  constraint published_articles_need_publication_time check (status <> 'published' or published_at is not null)
);

create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create table public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  title text not null,
  slug text not null,
  excerpt text not null,
  body jsonb not null,
  cover_image_path text,
  author_profile_id uuid not null references public.profiles(user_id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  status public.publication_status not null,
  seo_title text,
  seo_description text,
  scheduled_for timestamptz,
  published_at timestamptz,
  change_type text not null check (change_type in ('content_update', 'workflow_transition')),
  change_note text not null check (char_length(change_note) between 1 and 500),
  changed_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (article_id, revision_number)
);

create table public.editorial_activity (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  actor_profile_id uuid references public.profiles(user_id) on delete set null,
  action text not null check (action in (
    'article_created', 'article_updated', 'submitted_for_review', 'changes_requested',
    'approved', 'scheduled', 'published', 'archived'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index articles_author_status_idx on public.articles(author_profile_id, status, updated_at desc);
create index articles_category_status_published_idx on public.articles(category_id, status, published_at desc);
create index articles_publication_schedule_idx on public.articles(scheduled_for) where status = 'scheduled';
create index articles_search_idx on public.articles using gin(search_document);
create index article_revisions_article_created_idx on public.article_revisions(article_id, created_at desc);
create index editorial_activity_article_created_idx on public.editorial_activity(article_id, created_at desc);
create index editorial_activity_actor_created_idx on public.editorial_activity(actor_profile_id, created_at desc);

create function bliss_private.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.user_id = (select auth.uid())
$$;

create function bliss_private.is_public_author(target_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.articles a
    where a.author_profile_id = target_user_id and a.status = 'published'
  )
$$;

create function bliss_private.is_published_cover(target_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select target_path is not null and exists (
    select 1 from public.articles a
    where a.cover_image_path = target_path and a.status = 'published'
  )
$$;

create function bliss_private.can_edit_article(target_article_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.articles a
    where a.id = target_article_id and (
      bliss_private.current_app_role() = 'administrator' or
      (bliss_private.current_app_role() = 'editor' and a.status <> 'archived') or
      (bliss_private.current_app_role() = 'author' and a.author_profile_id = (select auth.uid())
        and a.status in ('draft', 'changes_requested'))
    )
  )
$$;

create function public.set_profile_role(target_user_id uuid, requested_role public.app_role)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if bliss_private.current_app_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Only administrators can change editorial roles' using errcode = '42501';
  end if;
  update public.profiles set role = requested_role, updated_at = now() where user_id = target_user_id;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end
$$;

create function bliss_private.create_profile_for_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles(user_id, display_name, role)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), 'Bliss member'), 'author')
  on conflict (user_id) do nothing;
  return new;
end
$$;

create trigger auth_user_profile_created
  after insert on auth.users
  for each row execute function bliss_private.create_profile_for_auth_user();

create function bliss_private.enforce_article_workflow()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
declare
  actor_role public.app_role := bliss_private.current_app_role();
  is_trusted_server boolean := current_user in ('postgres', 'supabase_admin', 'service_role');
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
    if actor_role = 'author' and (new.author_profile_id <> (select auth.uid()) or new.status <> 'draft') then
      raise exception 'Authors may only create their own drafts' using errcode = '42501';
    end if;
    if actor_role = 'editor' and (new.author_profile_id <> (select auth.uid()) or new.status <> 'draft') then
      raise exception 'Editors may only create drafts assigned to themselves' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.id <> old.id or new.created_at <> old.created_at then
    raise exception 'Article identity and creation time are immutable' using errcode = '42501';
  end if;
  if new.author_profile_id <> old.author_profile_id and actor_role <> 'administrator' and not is_trusted_server then
    raise exception 'Only administrators may reassign article authors' using errcode = '42501';
  end if;

  if not is_trusted_server then
    if actor_role = 'author' then
      if old.author_profile_id <> (select auth.uid()) or old.status not in ('draft', 'changes_requested')
        or new.status not in ('draft', 'changes_requested', 'in_review') then
        raise exception 'Authors may edit drafts or requested changes and submit them for review' using errcode = '42501';
      end if;
      if new.published_at is distinct from old.published_at or new.scheduled_for is distinct from old.scheduled_for then
        raise exception 'Authors cannot schedule or publish articles' using errcode = '42501';
      end if;
    elsif actor_role = 'editor' then
      if old.status not in ('in_review', 'changes_requested', 'approved', 'scheduled', 'published') then
        raise exception 'Editors may only edit articles in the review workflow' using errcode = '42501';
      end if;
      if new.status = 'published' and old.status not in ('approved', 'scheduled', 'published') then
        raise exception 'An article must be approved before publication' using errcode = '42501';
      end if;
      if new.status = 'published' and old.status = 'scheduled' and old.scheduled_for > now() then
        raise exception 'A scheduled article cannot be published before its scheduled time' using errcode = '42501';
      end if;
      if new.status = 'scheduled' and old.status not in ('approved', 'scheduled') then
        raise exception 'An article must be approved before it can be scheduled' using errcode = '42501';
      end if;
      if new.status = 'archived' then
        raise exception 'Only administrators may archive articles' using errcode = '42501';
      end if;
      if new.status = 'scheduled' and new.scheduled_for is null then
        raise exception 'Choose a scheduled publication time' using errcode = '23514';
      end if;
    elsif actor_role <> 'administrator' then
      raise exception 'An editorial role is required' using errcode = '42501';
    end if;
  end if;

  if new.status = 'scheduled' and new.scheduled_for is null then
    raise exception 'Choose a scheduled publication time' using errcode = '23514';
  end if;
  if new.status = 'scheduled' and new.scheduled_for <= now() then
    raise exception 'Scheduled publication time must be in the future' using errcode = '23514';
  end if;
  if new.status <> 'scheduled' then new.scheduled_for := null; end if;
  if new.status = 'published' then
    if old.status is distinct from 'published' then
      new.published_at := coalesce(new.published_at, now());
    else
      new.published_at := old.published_at;
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger articles_workflow_guard
  before insert or update on public.articles
  for each row execute function bliss_private.enforce_article_workflow();

create function bliss_private.record_article_activity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  next_revision integer;
  revision_kind text;
  event_name text;
  note text;
begin
  if tg_op = 'INSERT' then
    insert into public.editorial_activity(article_id, actor_profile_id, action, details)
    values (new.id, (select auth.uid()), 'article_created', jsonb_build_object('status', new.status));
    return new;
  end if;

  if row(old.title, old.slug, old.excerpt, old.body, old.cover_image_path, old.author_profile_id,
         old.category_id, old.status, old.seo_title, old.seo_description, old.scheduled_for, old.published_at)
     is distinct from
     row(new.title, new.slug, new.excerpt, new.body, new.cover_image_path, new.author_profile_id,
         new.category_id, new.status, new.seo_title, new.seo_description, new.scheduled_for, new.published_at) then
    select coalesce(max(r.revision_number), 0) + 1 into next_revision
    from public.article_revisions r where r.article_id = old.id;
    revision_kind := case when old.status is distinct from new.status then 'workflow_transition' else 'content_update' end;
    note := coalesce(nullif(btrim(new.last_change_note), ''),
      case when old.status is distinct from new.status then 'Status changed from ' || old.status || ' to ' || new.status
      else 'Article content updated' end);
    insert into public.article_revisions(
      article_id, revision_number, title, slug, excerpt, body, cover_image_path, author_profile_id,
      category_id, status, seo_title, seo_description, scheduled_for, published_at,
      change_type, change_note, changed_by
    ) values (
      old.id, next_revision, old.title, old.slug, old.excerpt, old.body, old.cover_image_path, old.author_profile_id,
      old.category_id, old.status, old.seo_title, old.seo_description, old.scheduled_for, old.published_at,
      revision_kind, left(note, 500), (select auth.uid())
    );

    event_name := case
      when old.status is not distinct from new.status then 'article_updated'
      when new.status = 'in_review' then 'submitted_for_review'
      when new.status = 'changes_requested' then 'changes_requested'
      when new.status = 'approved' then 'approved'
      when new.status = 'scheduled' then 'scheduled'
      when new.status = 'published' then 'published'
      when new.status = 'archived' then 'archived'
      else 'article_updated'
    end;
    insert into public.editorial_activity(article_id, actor_profile_id, action, details)
    values (new.id, (select auth.uid()), event_name,
      jsonb_build_object('from_status', old.status, 'to_status', new.status,
        'revision_number', next_revision, 'change_note', left(note, 500)));
  end if;
  return new;
end
$$;

create trigger articles_revision_activity
  after insert or update on public.articles
  for each row execute function bliss_private.record_article_activity();

create function bliss_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function bliss_private.touch_updated_at();
create trigger categories_touch_updated_at before update on public.categories
  for each row execute function bliss_private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_revisions enable row level security;
alter table public.editorial_activity enable row level security;

create policy profiles_public_author_or_self_read on public.profiles
  for select to anon, authenticated using (user_id = (select auth.uid()) or bliss_private.is_public_author(user_id));
create policy profiles_self_or_admin_update on public.profiles
  for update to authenticated using (
    user_id = (select auth.uid()) or bliss_private.current_app_role() = 'administrator'
  ) with check (
    (user_id = (select auth.uid()) and role = bliss_private.current_app_role()) or
    bliss_private.current_app_role() = 'administrator'
  );

create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);
create policy categories_admin_manage on public.categories
  for all to authenticated using (bliss_private.current_app_role() = 'administrator')
  with check (bliss_private.current_app_role() = 'administrator');

create policy tags_public_read on public.tags
  for select to anon, authenticated using (true);
create policy tags_admin_manage on public.tags
  for all to authenticated using (bliss_private.current_app_role() = 'administrator')
  with check (bliss_private.current_app_role() = 'administrator');

create policy articles_public_or_editorial_read on public.articles
  for select to anon, authenticated using (
    status = 'published' or author_profile_id = (select auth.uid()) or
    bliss_private.current_app_role() in ('editor', 'administrator')
  );
create policy articles_author_create_draft on public.articles
  for insert to authenticated with check (
    author_profile_id = (select auth.uid()) and status = 'draft' and bliss_private.current_app_role() = 'author'
  );
create policy articles_editor_create_draft on public.articles
  for insert to authenticated with check (
    author_profile_id = (select auth.uid()) and status = 'draft' and bliss_private.current_app_role() = 'editor'
  );
create policy articles_author_edit_and_submit on public.articles
  for update to authenticated using (
    author_profile_id = (select auth.uid()) and bliss_private.current_app_role() = 'author'
    and status in ('draft', 'changes_requested')
  ) with check (
    author_profile_id = (select auth.uid()) and bliss_private.current_app_role() = 'author'
    and status in ('draft', 'changes_requested', 'in_review')
  );
create policy articles_editor_review on public.articles
  for update to authenticated using (
    bliss_private.current_app_role() = 'editor' and status in ('in_review', 'changes_requested', 'approved', 'scheduled', 'published')
  ) with check (
    bliss_private.current_app_role() = 'editor' and status in ('in_review', 'changes_requested', 'approved', 'scheduled', 'published')
  );
create policy articles_admin_manage on public.articles
  for all to authenticated using (bliss_private.current_app_role() = 'administrator')
  with check (bliss_private.current_app_role() = 'administrator');

create policy article_tags_read_authorized on public.article_tags
  for select to anon, authenticated using (
    exists (select 1 from public.articles a where a.id = article_id and (
      a.status = 'published' or a.author_profile_id = (select auth.uid()) or
      bliss_private.current_app_role() in ('editor', 'administrator')
    ))
  );
create policy article_tags_edit_authorized on public.article_tags
  for all to authenticated using (bliss_private.can_edit_article(article_id))
  with check (bliss_private.can_edit_article(article_id));

create policy revisions_author_and_staff_read on public.article_revisions
  for select to authenticated using (
    exists (select 1 from public.articles a where a.id = article_id and (
      a.author_profile_id = (select auth.uid()) or bliss_private.current_app_role() in ('editor', 'administrator')
    ))
  );

create policy activity_author_and_staff_read on public.editorial_activity
  for select to authenticated using (
    bliss_private.current_app_role() in ('editor', 'administrator') or
    exists (select 1 from public.articles a where a.id = article_id and a.author_profile_id = (select auth.uid()))
  );

revoke all on public.profiles, public.categories, public.tags, public.articles,
  public.article_tags, public.article_revisions, public.editorial_activity from anon, authenticated;
grant select (user_id, display_name, bio, avatar_path, created_at, updated_at) on public.profiles to anon, authenticated;
grant select (role) on public.profiles to authenticated;
grant update (display_name, bio, avatar_path) on public.profiles to authenticated;
grant select on public.categories, public.tags to anon, authenticated;
grant insert, update, delete on public.categories, public.tags to authenticated;
grant select on public.articles, public.article_tags to anon, authenticated;
-- Articles are archived through workflow; hard delete would cascade revisions.
grant insert, update on public.articles to authenticated;
grant insert, update, delete on public.article_tags to authenticated;
grant select on public.article_revisions, public.editorial_activity to authenticated;

revoke all on function bliss_private.current_app_role() from public, anon;
revoke all on function bliss_private.is_public_author(uuid) from public;
revoke all on function bliss_private.is_published_cover(text) from public;
revoke all on function bliss_private.can_edit_article(uuid) from public, anon;
revoke all on function public.set_profile_role(uuid, public.app_role) from public, anon;
-- Safe for anon: auth.uid() is null and the function returns no role. Policies
-- that combine public reads with editorial reads still need function EXECUTE.
grant execute on function bliss_private.current_app_role() to anon, authenticated, service_role;
grant execute on function bliss_private.is_public_author(uuid) to anon, authenticated;
grant execute on function bliss_private.is_published_cover(text) to anon, authenticated;
grant execute on function bliss_private.can_edit_article(uuid) to authenticated;
grant execute on function public.set_profile_role(uuid, public.app_role) to authenticated;

-- Fail closed if this bucket already exists as public. Do not silently leave
-- a conflicting bucket configuration exposed or change existing file data.
do $$
begin
  if exists (select 1 from storage.buckets where id = 'article-covers' and public) then
    raise exception 'The existing article-covers bucket is public; make it private and review its existing storage policies before continuing';
  end if;
  if exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects'
      and p.cmd in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL')
      and p.roles && array['anon'::name, 'authenticated'::name, 'public'::name]
  ) then
    raise exception 'Review existing anon/authenticated/public storage.objects policies before continuing; permissive policies combine with article-covers RLS policies';
  end if;
end
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('article-covers', 'article-covers', false, 15728640, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

create policy article_covers_read_published_or_owned on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'article-covers' and (
      bliss_private.is_published_cover(name) or (
        (select auth.uid()) is not null and (
          bliss_private.current_app_role() in ('editor', 'administrator') or
          ((storage.foldername(name))[1] = (select auth.uid())::text and bliss_private.current_app_role() = 'author')
        )
      )
    )
  );
create policy article_covers_insert_owned_folder on storage.objects
  for insert to authenticated with check (
    bucket_id = 'article-covers' and (storage.foldername(name))[1] = (select auth.uid())::text
    and bliss_private.current_app_role() in ('author', 'editor', 'administrator')
  );
create policy article_covers_update_owned_or_staff on storage.objects
  for update to authenticated using (
    bucket_id = 'article-covers' and (
      bliss_private.current_app_role() in ('editor', 'administrator') or
      ((storage.foldername(name))[1] = (select auth.uid())::text and bliss_private.current_app_role() = 'author')
    )
  ) with check (
    bucket_id = 'article-covers' and (storage.foldername(name))[1] = (select auth.uid())::text
    and bliss_private.current_app_role() in ('author', 'editor', 'administrator')
  );
create policy article_covers_delete_owned_or_staff on storage.objects
  for delete to authenticated using (
    bucket_id = 'article-covers' and (
      bliss_private.current_app_role() in ('editor', 'administrator') or
      ((storage.foldername(name))[1] = (select auth.uid())::text and bliss_private.current_app_role() = 'author')
    )
  );

commit;
