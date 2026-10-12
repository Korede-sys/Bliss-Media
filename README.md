# Bliss Media — Phase 1

Public editorial magazine foundation built with Next.js App Router, TypeScript and Tailwind CSS 4. This phase contains only the public website. Story records in `src/lib/content.ts` are explicitly illustrative local sample content; there is no connected database, authentication, CMS, or newsletter submission.

## Routes

- `/` — editorial homepage with cover story, trending, latest, editor’s pick, and category discovery
- `/article/[slug]` — sample story, author information, and related stories
- `/category/[category]` — category index, including all five planned categories
- `/search?q=...` — local sample-content search with an empty state
- Missing routes and runtime failures have friendly recovery UI

## Run locally

```sh
npm install
npm run dev
```

Use `npm run lint`, `npm run typecheck`, and `npm run build` for checks. Remote editorial photography is sourced from Unsplash URLs for the prototype. No Supabase connection or production content has been configured.

## Later phases

Once this visual foundation is reviewed: connect reviewed production content to Supabase, add the editorial CMS and TipTap authoring, then wire production search, newsletter, publishing workflows, and deployment to GitHub/Vercel.
