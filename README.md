# Hikmah | حكمة

A complete bilingual wisdom-game platform with a fresh database. The source is independent of the uploaded Replit project. It retains the supplied logo, palette and puzzle content without copying credentials or Git history.

## Play

- Missing Letters, Multiple Choice and Cryptogram in English and Arabic.
- Solo: ten puzzles, untimed, guest or signed-in play.
- Multiplayer: two to eight signed-in players, five identical puzzle rounds, first correct solution wins each round. The highest round-win total wins; equal totals draw.
- Multiplayer limits: 45 seconds for MCQ, 90 seconds for Missing Letters, 180 seconds for Cryptogram. A wrong MCQ answer locks that player out of the round. Word games allow corrections. An unsolved round has no winner.
- Six-second results interval between multiplayer rounds. Server timestamps govern deadlines. Returning members recover the current round. An active member replaces an absent host after 45 seconds.
- HR: 20 starting credit, 5 per solo skip, 2 per correct answer plus a speed bonus of 5 at up to 5 seconds, 3 at up to 10 seconds, 2 at up to 20 seconds, or 1 thereafter. Credits use a server-owned ledger with unique round references.
- Profiles, avatar uploads, history, weekly/all-time leaderboards, reports, editable puzzle content, archive/restore, account suspension, data deletion, and light/dark themes.

## Project structure

- `app/`: routes, shared application shell and authenticated API boundaries.
- `components/hikmah/`: focused home, lobby, game, profile, settings, leaderboard and administration interfaces.
- `lib/game/rules.ts`: pure validation, normalization, shuffle and public puzzle projections.
- `lib/game/service.ts`: database-backed game lifecycle, room membership and wallet updates.
- `lib/game/seed.json`: 80 initial puzzles, 40 MCQ, 20 missing-word and 20 cryptogram.
- `backend/`: portable game API hosted as a Supabase Edge Function.
- `db/raw.ts`: Postgres transaction adapter and Supabase Storage access.
- `supabase/migrations/`: applied Postgres schema migrations.
- `drizzle/`: immutable historical D1 migrations, retained for source history and regression tests.
- `public/`: original logo and favicon.
- `tests/game-service.mjs`: real service tests against SQLite through a D1-compatible adapter.

## Standard Next.js runtime and Netlify

The interface and its server API now use standard Next.js App Router on Node.js. The default commands are `pnpm dev`, `pnpm build`, and `pnpm start`. Cloudflare Workers, Vinext, Wrangler and their build wrappers are no longer required. `netlify.toml` builds with `pnpm run build` and publishes `.next`. The Netlify configuration explicitly enables its Next.js adapter for source upload deployments, including server route handlers. This is a server-rendered application, not a static export or drag-and-drop HTML deployment.

The existing published ChatGPT Site remains on its previous working deployment. The converted frontend is deployed at https://hikmah-wisdom-games.netlify.app. As of 2026-09-18, pages and the email login form load, but the game API returns 503 while backend credential configuration remains unresolved. Email delivery, Google provider configuration and owner-account linking also remain pending. The historical `.openai/hosting.json` identifies the original Site only; it is not used by the standard Next.js build.

All game data stays in Supabase project `vilgghdzyqdsvbaazphh`, in the private `hikmah` schema. Avatars stay in the private `hikmah-avatars` bucket. The `hikmah-api` Edge Function runs the game rules beside Postgres. This build conversion changes no game rules or database data.

### Authentication and hosting

Email/password signup, email confirmation, sign-in, password recovery, Google OAuth with PKCE, session refresh, and logout are implemented. The server validates accounts with Supabase Auth before forwarding identity. Google account selection is independent of ChatGPT. Its button stays disabled until Supabase enables the provider.

New accounts use stable Supabase UUID mappings. Existing profiles and HR history are preserved. A legacy profile can be explicitly linked through `profiles.auth_user_id` after ownership verification; accounts are never merged by name. The existing administrator remains assigned. New signups cannot become administrators automatically.

Netlify project: `hikmah-wisdom-games`, ID `bfba38b2-602d-4890-8048-d6c6a0e4f7ea`. The application source is published to the public GitHub repository `nuqatapp/hikmah` with the owner's approval. Automatic Git-based deployment is not connected yet. The existing Nuqat website is separate. See `DEPLOYMENT.md` for remaining setup.

### Netlify configuration

Build command: `pnpm run build`. Publish directory: `.next`. Node.js: 22. Use the pinned pnpm version in `package.json`.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Builds and Functions | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Builds and Functions | Public Auth client key |
| `HIKMAH_BACKEND_URL` | Functions | Game API endpoint |
| `HIKMAH_BACKEND_TOKEN` | Functions, secret | Private server credential |

The backend URL is `https://vilgghdzyqdsvbaazphh.supabase.co/functions/v1/hikmah-api`. Never commit the token. Netlify uses a separate credential from Sites. Database transactions remain serializable.

The table lists the intended minimum scopes. Netlify Free uses all scopes for the public values; granular secret scoping requires a supported plan. The owner approved default production scope, but automatic approval review separately rejected an unmarked environment variable because it would lack secret masking. The backend responds successfully when called directly; its Netlify connection remains unresolved. See `DEPLOYMENT.md` for the current status.

Configure Supabase Auth Site URL for the production origin and allow `/auth/callback`, including its password recovery query string. Keep email confirmation enabled. Configure custom SMTP before accepting public email signups; Supabase's default mail service restricts recipients. Google requires its OAuth Client ID and Client Secret in Supabase. Google's callback remains `https://vilgghdzyqdsvbaazphh.supabase.co/auth/v1/callback` when frontend hosting changes.

For a custom domain, add it to Hikmah's Netlify project, set DNS, then update Supabase's Site URL and allowed redirects. No database copy is required. Never expose private tables to the Data API to make login work.

### Local commands

- `pnpm install --frozen-lockfile`
- Copy `.env.example` to `.env.local` and securely provide the backend token.
- `pnpm dev`: Next.js development server.
- `pnpm build`: standard Next.js production build.
- `pnpm start`: run that production build.
- `pnpm typecheck`: TypeScript verification.
- `pnpm test:game`: 80 puzzles and 90 game rounds against the local SQLite regression adapter.
- `node tests/auth-runtime.mjs`: verified/revoked sessions, metadata isolation, PKCE callbacks, redirect validation, logout and CSRF with a local Auth mock. Run after a build without public Auth variables to allow test overrides.
- `node tests/next-runtime.mjs`: production HTTP smoke checks with a local mock backend, including forged identity rejection. Run after the build.
- `pnpm build:backend`: independently bundle the Supabase function. Do not redeploy it merely to change frontend hosting.

Historical D1 migrations remain immutable and are used only by the local game regression tests. New database changes belong in `supabase/migrations/`.

### Verification limits

The original Supabase backend was checked with temporary accounts for saved answers and balances, duplicate reward prevention, a simultaneous multiplayer winner, history/leaderboard queries, and avatar upload/download/account deletion. The full live test matrix did not complete because some remote test requests exceeded MCQ round deadlines. The 90-round local game regression suite passed. Real email delivery and Google OAuth require provider configuration and end-to-end verification.

## Database inspection

Select the `hikmah` schema in Supabase's Table Editor. Tables cover profiles, content, rooms, members, rounds, attempts, wallet, reports, site settings and private backend credentials. The initial database contains 80 bilingual puzzles and no imported user data. Inspect avatars through Storage, not SQL writes to `storage.objects`.

`tests/supabase-backend.py` is an explicit live integration check. Supply the two backend environment variables only in the local process. It creates accounts prefixed `integration-20260916-`; never treat those as real players. After testing, remove only those accounts' rooms, reports, wallet entries, attempts and profiles, and clear `site_settings.admin_user` only if it points to one of those synthetic IDs. The normal regression test remains local-only.
