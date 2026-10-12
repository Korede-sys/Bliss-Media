import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../supabase/migrations/202610120001_editorial_foundation.sql', import.meta.url), 'utf8')
const bootstrap = await readFile(new URL('../supabase/bootstrap-first-admin.example.sql', import.meta.url), 'utf8')
const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8')

test('all editorial tables have row-level security enabled', () => {
  for (const table of ['profiles', 'categories', 'tags', 'articles', 'article_tags', 'article_revisions', 'editorial_activity']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `${table} must enable RLS`)
  }
})

test('new auth users are always assigned the least-privileged author role', () => {
  assert.match(migration, /insert into public\.profiles\s*\(user_id, display_name, role\)[\s\S]*?new\.id[\s\S]*?'author'/i)
  assert.doesNotMatch(migration, /new\.raw_user_meta_data\s*->>\s*'role'/i)
  assert.match(migration, /create trigger auth_user_profile_created[\s\S]*?after insert on auth\.users/i)
})

test('article writes require editorial roles and cannot hard-delete revision history', () => {
  assert.match(migration, /articles_author_create_draft[\s\S]*?status\s*=\s*'draft'[\s\S]*?current_app_role\(\)\s*=\s*'author'/i)
  assert.match(migration, /articles_author_edit_and_submit[\s\S]*?status in \('draft', 'changes_requested', 'in_review'\)/i)
  assert.match(migration, /An article must be approved before publication/i)
  assert.match(migration, /An article must be approved before it can be scheduled/i)
  assert.match(migration, /A scheduled article cannot be published before its scheduled time/i)
  assert.match(migration, /grant insert, update on public\.articles to authenticated/i)
  assert.doesNotMatch(migration, /grant insert, update, delete on public\.articles\b/i)
})

test('role changes are administrator-gated and first-admin bootstrap is serialized', () => {
  assert.match(migration, /function public\.set_profile_role[\s\S]*?bliss_private\.current_app_role\(\) is distinct from 'administrator'/i)
  assert.match(migration, /revoke all on function public\.set_profile_role[\s\S]*?from public, anon/i)
  assert.match(migration, /grant execute on function public\.set_profile_role[\s\S]*?to authenticated/i)
  assert.match(migration, /grant update \(display_name, bio, avatar_path\) on public\.profiles to authenticated/i)
  assert.doesNotMatch(migration, /grant update \([^)]*\brole\b[^)]*\) on public\.profiles to authenticated/i)
  assert.match(migration, /create schema bliss_private authorization postgres/i)
  assert.match(migration, /revoke all on schema bliss_private from public, anon, authenticated/i)
  assert.match(migration, /grant usage on schema bliss_private to anon, authenticated, service_role/i)
  assert.match(migration, /create function bliss_private\.current_app_role\(\)[\s\S]*?security definer[\s\S]*?set search_path = ''/i)
  assert.doesNotMatch(migration, /create function public\.(current_app_role|is_public_author|is_published_cover|can_edit_article)\b/i)
  assert.match(bootstrap, /pg_advisory_xact_lock/i)
  assert.match(bootstrap, /target_user_id_text !~\*/i)
  assert.match(bootstrap, /if exists \(select 1 from public\.profiles where role = 'administrator'\)/i)
  assert.match(bootstrap, /update public\.profiles set role = 'administrator'/i)
})

test('security-definer routines pin an empty search path and stay out of exposed public', () => {
  const routines = migration.split(/(?=create function )/i).filter(block => /^create function /i.test(block))
  const definers = routines.filter(block => /security definer/i.test(block.split('$$')[0]))
  assert.ok(definers.length > 0, 'expected security-definer routines')
  for (const routine of definers) {
    const header = routine.split('$$')[0]
    assert.match(header, /set search_path = ''/i, header.slice(0, 100))
    if (!/^create function public\.set_profile_role\(/i.test(header)) {
      assert.match(header, /^create function bliss_private\./i, header.slice(0, 100))
    }
  }
})

test('cover storage is private and migration fails closed on conflicting public access', () => {
  assert.match(migration, /values \('article-covers', 'article-covers', false,/i)
  assert.match(migration, /existing article-covers bucket is public/i)
  assert.match(migration, /Review existing anon\/authenticated\/public storage\.objects policies/i)
  assert.match(migration, /create policy article_covers_read_published_or_owned[\s\S]*?is_published_cover\(name\)/i)
  assert.match(migration, /create policy article_covers_insert_owned_folder[\s\S]*?storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/i)
})

test('environment template contains public placeholders only', () => {
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL=https:\/\/your-project\.supabase\.co/i)
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me/i)
  assert.doesNotMatch(envExample, /SERVICE_ROLE|service_role|sb_secret|eyJ[A-Za-z0-9_-]{24,}/i)
})
