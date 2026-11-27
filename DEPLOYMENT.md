# Hikmah deployment

Production pointers verified on 2026-11-27 against the Netlify and Supabase project APIs. The verification and credential history below dates to September 2026.

- Live site: https://hikmahgame.com
- Netlify project: hikmah-wisdom-games, bfba38b2-602d-4890-8048-d6c6a0e4f7ea.
- Production deploy: the Netlify production deploy of `main`. Before the monitoring release it was 6b034465e9967ce655e960a2 (22 November, f067045); the merge of pull request 15 replaces it. Read the current id in Netlify.
- Public source: https://github.com/nuqatapp/hikmah, main. Publication was explicitly approved by the owner.
- Supabase: vilgghdzyqdsvbaazphh, private hikmah schema. The production game API is the `hikmah-api-integrity` Edge Function. It has been the production endpoint since 22 November 2026 and runs version 3, deployed 27 November 2026, which reports `2026-11-24-monitoring`. The production `HIKMAH_BACKEND_URL` points to it.
- `hikmah-api-candidate` (version 7, preview validation) runs the same bundle. On 27 November a Deploy Preview request against it returned 200 with `2026-11-24-monitoring`, a guest game was created, and the failure counter recorded a rejected duplicate.
- Both functions are a five-line entry file that imports `supabase/functions/hikmah-api/index.js` from this public repository at commit 14df003, plus `deno.json`. The file is fetched once at deploy time. The build directory name is the output path, not the name of the production function. See [Releasing the backend](docs/OPERATIONS.md#releasing-the-backend).
- The earlier `hikmah-api` (version 6, last updated 19 November) remains deployed and is not the production endpoint. Retire it only after the owner confirms no deployment still references it. Deploy Previews fall back to it only if `HIKMAH_PREVIEW_BACKEND_URL` is removed.

## Working and verified

- Standard Next.js production build with the explicit Netlify Next.js adapter.
- All eight page routes return HTTP 200.
- The live game API loads all 80 puzzles and saves a correct guest solo answer.
- Forged client identity remains unsigned; guests cannot create multiplayer rooms or read account profiles.
- The temporary test room was removed. The existing real player profile, administrator assignment, puzzles, and HR balances were preserved.
- Netlify scanned 145 deployed files and reported no secret matches.
- Earlier local verification passed 90 game rounds, guest runtime checks, and mocked authentication security tests. Real provider sign-in and authenticated multiplayer still need end-to-end verification after provider setup.

## Masked credential configuration

The owner requires the credential to remain marked as a secret and chose the Free-plan option with Builds, Functions, and Runtime scopes. HIKMAH_BACKEND_TOKEN was configured with Contains secret values enabled, a production-only value, and those three scopes. Post processing is excluded. Do not replace this with an unmarked variable, put it in source, or give it a NEXT_PUBLIC_ name.

The active dedicated credential is netlify-production-20260919. Older unused Netlify credentials from September 17 and 18 were revoked. The production game API was verified again after revocation. Existing Sites credentials were not changed.

Netlify Free includes Secrets Controller. Restricting scopes to Functions only is a separate Pro/Enterprise feature; do not require a paid upgrade for masking itself. No plan upgrade was made.

The Netlify connector may report "upserted" even when an underlying create request fails. Use a new deployment and live runtime checks to verify changes. Earlier attempts using all scopes included prohibited Post processing; granular Functions-only or Builds/Functions attempts did not establish a working connection. The approved three-scope masked configuration resolved the live connection.

References: https://docs.netlify.com/build/environment-variables/overview/ and https://docs.netlify.com/build/environment-variables/secrets-controller/

## Error monitoring

Sentry error monitoring is wired into the browser, the Next.js server, the `privacy-maintenance` scheduled function and the game Edge Function. It stays off until a DSN is configured, and only an EU (Germany) DSN is accepted. The backend release `2026-11-24-monitoring` is live in production since 27 November 2026; a frontend release never deploys the backend. Configuration, what is sent and the release steps are in [docs/OPERATIONS.md](docs/OPERATIONS.md#error-monitoring-sentry). The admin Health tab shows a red warning while the live backend release differs from `backend/version.ts`.

| Variable | Where | Scope and secrecy |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Netlify | Builds, Functions, Runtime. Not a secret. |
| `SENTRY_ORG` | Netlify | Builds, Functions, Runtime. Not a secret. |
| `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Netlify | Builds only. The token is a secret. Optional: readable stack traces. |
| `SENTRY_ISSUES_TOKEN` | Netlify | Functions, Runtime. Secret, read-only `event:read`. Never `NEXT_PUBLIC_`. |
| `SENTRY_DSN` | Supabase function secrets | Same DSN, for the Edge Function. Set on 27 November 2026. |

## Remaining setup

1. Supabase Auth URL Configuration: set Site URL to https://hikmahgame.com and allow https://hikmahgame.com/auth/callback**. Keep the redirect pattern restricted to the exact host; the suffix includes password recovery query strings.
2. Google sign-in: configure the owner's Google Cloud OAuth Client ID and Client Secret in Supabase. Google callback: https://vilgghdzyqdsvbaazphh.supabase.co/auth/v1/callback. Keep the secret out of frontend code and GitHub.
3. Configure production SMTP for confirmation and recovery emails. Keep email confirmation enabled.
4. After the owner creates a verified account, explicitly link the existing legacy profile through profiles.auth_user_id without replacing its game data. New signups never become administrators automatically.
5. Netlify builds production from `nuqatapp/hikmah` on `main` and builds Deploy Previews for pull requests. Review the preview and follow the [coordinated release procedure](docs/OPERATIONS.md#coordinated-release) for backend changes.

Supabase's plugin does not expose Auth URL, Google provider, or SMTP configuration. Verify the current auth settings in the Supabase dashboard before changing them.
