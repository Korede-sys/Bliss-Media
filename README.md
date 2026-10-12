# Bliss Media

Bliss Media is a premium editorial magazine built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase. The public site preserves the Phase 1 design. `src/lib/content.ts` keeps the six editorial fixtures as clearly marked development samples; those fixtures are used only when Supabase is not configured. When configured, public pages read published articles from Supabase and surface query failures instead of replacing them with demo stories.

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, copy the template with `Copy-Item .env.example .env.local`. Add your Supabase project URL and **publishable** key to `.env.local`. Until those two values are set, the public site stays in sample mode and staff sign-in reports that it is unavailable. There are no credentials or project secrets in this repository. Never expose a service-role key or secret key to a browser or commit a real `.env.local` file.

## Supabase setup

1. Create a Supabase project and copy its project URL and publishable key from the project API settings to `.env.local`.
2. Apply `supabase/migrations/202610120001_editorial_foundation.sql` once to that project in the Supabase SQL editor. Alternatively, initialize Supabase CLI configuration for this repo, link the project, and run `supabase db push`; this starter contains migrations but not the CLI-generated `config.toml`. The migration creates the editorial schema, RLS policies, role guards, profile bootstrap trigger, and private `article-covers` storage bucket. It does not seed or overwrite article content.
3. Optionally run `supabase/seed.dev.sql` against a **development project only** to add the five categories and sample tags. It is idempotent and does not insert article/sample story rows. The public fixtures remain local code, not production database content.
4. Keep Supabase Auth public sign-ups disabled in project settings. Create or invite a staff user through the trusted Supabase dashboard, then copy that user's UUID from Authentication → Users. New profiles always start as `author`; user metadata cannot grant a role.
5. For the first administrator only, replace the clearly marked UUID in `supabase/bootstrap-first-admin.example.sql` and run it once in the trusted SQL editor as the database owner. It aborts if an administrator already exists and fails when the target auth profile is missing. Keep the actual UUID and any operational notes outside version control. Later role changes must use `set_profile_role` as an administrator.
6. Invite Authors and Editors through the dashboard. There is no public administrator registration or password reset flow in this foundation. Password sign-in is at `/admin/sign-in`; all `/admin` routes require a current session and editorial profile.

The server and browser use only the publishable key and user session. Server operations still run under Supabase RLS; there is no service-role client. Public content uses the published status filter. Private cover files are served with short-lived signed URLs after Storage RLS authorization. Keep `bliss_private` out of the project's exposed PostgREST schemas; the application needs it only for policy evaluation.

## Phase 2 foundation included

- Browser and server Supabase clients using `@supabase/ssr`, plus Next.js middleware session refresh.
- SQL schema for profiles, categories, tags, article/tag joins, articles, immutable snapshots in revision history, editorial activity, indexes, RLS, and the private cover bucket.
- Explicit role and publication-state enums, server-side workflow guards, and authorization policies. Authors may draft, revise their own drafts or requested changes, and submit for review. Editors review/approve/schedule/publish according to the workflow. Administrators manage roles and archive.
- An invitation-only sign-in screen and protected editorial overview. Full authoring/CMS workflows are out of scope for this foundation.
- Public article, category, search, and homepage routes read published database content when configured; TipTap JSON is rendered as safe React elements, not injected HTML.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm run test:security
```

`npm run test:security` is a static regression check of the migration and bootstrap SQL, not a substitute for database authorization tests. Follow [`supabase/VERIFICATION.md`](supabase/VERIFICATION.md) against an isolated Supabase project before launch.

## GitHub handoff

The local repository is on `phase-2/backend` and has no remote. To publish it safely:

1. Sign into GitHub and create a **blank** repository named `bliss-media` under the intended account; leave README, license, and `.gitignore` initialization unchecked.
2. In this project folder, inspect `git status --short`, then stage and review with `git add -A` and `git diff --cached --name-only`. Confirm the real `.env*`, key files, and credentials are absent before committing. The repository `.gitignore` excludes local env files, key/certificate files, common service-role credential filenames, and local build output.
3. Commit the intended files, for example `git commit -m "Prepare Bliss Media backend foundation"`.
4. Set `$Owner = "your-github-username-or-org"` in PowerShell, verify it matches the repository page, then run `git remote add origin "https://github.com/$Owner/bliss-media.git"`. Inspect `git remote -v` before any push.
5. Authenticate using GitHub's browser/device flow (`gh auth login`) or the configured Git Credential Manager. Do not paste a token into chat or source files. Push only after confirming the owner and repo: `git push -u origin phase-2/backend`.

GitHub sign-in, repository creation, and confirmation of the correct owner URL require the project owner. No remote has been added and nothing has been pushed.

## Next steps

Configure and apply the schema to an actual Supabase project, validate the policies against test users for each role, then review the frontend against production content and cover images. GitHub remote configuration and Vercel deployment remain operational setup tasks; this repository has no configured remote.
