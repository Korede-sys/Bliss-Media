# Supabase backend verification checklist

Run this matrix only against a disposable development/staging Supabase project after reviewing and applying the migration. Do not use production data or the first administrator account for negative tests. Create separate invited users for Author A, Author B, Editor, and Administrator. Keep credentials in local tooling/environment variables; never paste them into source, shell history, or chat.

`npm run test:security` runs source-level regression checks for expected policy/guard clauses. Those tests do **not** execute PostgreSQL, simulate JWT roles, or prove that a deployed Supabase project has these policies. Record the project, migration version, role account, request, and expected/actual result for each live check below.

## Anonymous access

- [ ] Read categories/tags and published article fields successfully.
- [ ] Query an unpublished article by UUID and slug; neither row nor its revisions/activity are returned.
- [ ] Read only public-author profile fields for users with published work; do not receive a profile role.
- [ ] Read an image attached to a published article through the app's signed URL.
- [ ] Fail to list, read, upload, update, or delete an unpublished/private cover object.
- [ ] Fail every article, tag-join, profile, revision, activity, category, and tag write.

## Author A and Author B

- [ ] Author A can insert a draft only with Author A's own profile ID.
- [ ] Author A can read and update that draft, then move it to `in_review`.
- [ ] Author A cannot create an `in_review`, `approved`, `scheduled`, or `published` article; cannot move a submitted article onward; and cannot change author ownership, publication time, or schedule.
- [ ] Once submitted, Author A cannot change the article until an editor requests changes. When returned as `changes_requested`, A can edit and resubmit.
- [ ] Author A cannot read, update, delete, tag, or read revisions/activity for Author B's draft.
- [ ] Author A can read their own revisions and relevant activity but cannot insert/update/delete revision or activity rows directly.
- [ ] Author A can upload/read a cover under their own Auth UUID folder, but not another user's folder.

## Editor

- [ ] Editor can see editorial submissions and review history but cannot change a draft before its author submits it.
- [ ] Editor can request changes or approve an `in_review` article.
- [ ] Editor cannot publish directly from `in_review`/`changes_requested`; approval must happen first.
- [ ] Editor can publish an approved article or schedule it for a future time. A future scheduled article cannot be published early; after due time, publishing succeeds.
- [ ] Editor cannot assign another author, archive or hard-delete an article, alter a published timestamp, or promote a profile role.
- [ ] Editor can access staff cover images under the configured policy; confirm upload paths are scoped as intended.

## Administrator

- [ ] A non-admin call to `set_profile_role` fails, including when targeting the caller's own profile.
- [ ] A direct `profiles.role` update fails even for a signed-in non-admin; the column is not granted for updates.
- [ ] Administrator can call `set_profile_role` to assign Author/Editor/Administrator and can manage categories/tags.
- [ ] Administrator can archive articles; hard deletion remains unavailable through the authenticated table grant so revisions are retained.
- [ ] The first-admin bootstrap rejects its placeholder/invalid UUID, rejects a missing profile, and rejects all attempts after an administrator exists. Run its concurrency test in a disposable project if simultaneous bootstrap operations are part of the operational threat model.

## Authentication and unauthorized requests

- [ ] Project Auth public sign-ups are disabled; only invited/created accounts sign in. A new Auth user profile always has role `author`, regardless of user metadata.
- [ ] Anonymous requests to `/admin` redirect to sign-in; signed-in users without a profile receive the access-denied screen; expired sessions require sign-in again.
- [ ] Sign-out invalidates the local Supabase session and subsequent `/admin` navigation is unauthorized.
- [ ] REST calls made without a valid session cannot write protected data. Calls with a forged role in user metadata/JWT claims cannot gain a database role; verify only Auth-issued claims plus profile roles control access.

## Storage/migration preflight

- [ ] Confirm `article-covers` is private. The migration deliberately aborts if the bucket already exists as public or if any anon/authenticated/public policy exists on `storage.objects`; inspect all existing storage policies with the project owner before retrying. This conservative guard avoids permissive policies combining with the new bucket policies.
- [ ] Confirm `bliss_private` is not listed as an exposed PostgREST schema. The app needs schema usage to evaluate RLS helpers, but no browser should invoke those helper functions as RPC endpoints.
- [ ] Confirm published cover objects are readable only by the published-cover policy, while draft objects remain private.
- [ ] Confirm the migration applied atomically and the expected RLS policies, function grants, and indexes exist before creating real editorial users/content.

No live checks in this file have been run yet: this repository has no Supabase credentials/project connection and the migration has not been applied.
