# Hikmah privacy and release operations

Operator: Areej Ali. Personal project, Jeddah, Saudi Arabia, without commercial registration. Contact: Nuqat.app@gmail.com. These facts were confirmed by the operator on 13 November 2026.

## Coordinated release

The frontend is deployed by Netlify from `nuqatapp/hikmah`. The game backend is a separate Supabase Edge Function. A frontend deploy does not update that function.

1. Require the game/privacy CI checks and a successful Netlify Deploy Preview. Verify legal pages, both languages/themes, mobile layouts, keyboard controls and error recovery there.
2. Before enabling destructive maintenance, confirm the provider's backup retention and recovery process. Preserve the 13 unlinked legacy game profiles until ownership is established; never merge by nickname.
3. Migration `20261113084133_privacy_account_lifecycle` was applied to the confirmed project `vilgghdzyqdsvbaazphh` on 13 November 2026. It is additive. RLS is enabled on all three new private tables; verified `anon`/`authenticated` access is denied. Existing records were preserved.
   The same backend is deployed separately as `hikmah-api-candidate` for preview validation. Configure `HIKMAH_PREVIEW_BACKEND_URL` and the secret `HIKMAH_PREVIEW_BACKEND_TOKEN` in the Netlify Deploy Previews context only, with Functions scope. Provision only its SHA-256 hash in the private `hikmah.server_credentials` table. Production continues using `HIKMAH_BACKEND_URL` and `HIKMAH_BACKEND_TOKEN`; never overwrite the Production secret to fix a preview. The preview credential can be revoked independently when no longer needed.
4. Run `pnpm run build:backend`. Deploy the generated `supabase/functions/hikmah-api/index.js` and `deno.json` to the production function. Since 22 November 2026 that is `hikmah-api-integrity`; the directory name is only the build output path. Confirm the function behind the production `HIKMAH_BACKEND_URL` before deploying. Preserve its existing private server-token gate. Its gateway JWT setting is deliberately disabled because the function implements its own credential verification.
5. Publish the matching frontend promptly. Signed-in game actions require current account authorisation; an older frontend cannot complete that onboarding. Use a coordinated release window. Keep guest play available.
6. Verify that `X-Hikmah-Backend-Version` matches `BACKEND_VERSION` in the release's `backend/version.ts`, re-exported by `backend/index.ts` (the integrity release uses `2026-11-22-integrity`, the monitoring release `2026-11-24-monitoring`). The header is sent on every backend response, including errors. The admin Health tab shows both values and a red warning when they differ. Check it on game API responses, a complete session in each mode/language, two-account multiplayer, export and erasure with disposable accounts, and measured request latency. Do not infer a successful backend release from the Netlify commit alone.
7. Confirm Netlify registered the daily `privacy-maintenance` scheduled function (03:00 UTC / 06:00 Saudi time) and its production runtime has `HIKMAH_BACKEND_URL` and `HIKMAH_BACKEND_TOKEN`. A failed run must be investigated; the next daily run retries durable pending jobs.

No secret belongs in a browser bundle or this document. Supabase needs its existing server-side DB URL and service-role key. Netlify needs its existing private proxy token. `HIKMAH_BACKEND_REGION` optionally overrides the default Frankfurt function routing.

## Error monitoring (Sentry)

Sentry (Functional Software, Inc.) is a processor for error reports. Use an organisation created with the **European Union (EU)** data storage location, which Sentry stores at rest in Frankfurt, Germany. The location cannot be changed after the organisation is created. Some organisation metadata (account, settings, DSN keys, audit logs) is held in the United States under Sentry's documented model; error events are not.

**Coverage.** The browser and the Next.js server use `@sentry/nextjs` 11 (`instrumentation-client.ts`, `instrumentation.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `app/global-error.tsx`). The `privacy-maintenance` scheduled function and the Edge Function use the dependency-free reporter in `lib/monitoring/reporter.mjs`, which speaks Sentry's envelope protocol. Every event carries `surface` and `backend_version`, the latter taken from `X-Hikmah-Backend-Version`.

**What is sent.** Error type and message, stack trace with a few lines of this public source code around each frame, page or route address without query string, HTTP method, browser, operating system and runtime type and version (from the User-Agent, the only header kept), navigation and request breadcrumbs reduced to address, method and status, release, environment and fixed tags. Nothing else.

**What is not sent.** `@sentry/nextjs` 11 removed `sendDefaultPii` and collects every category by default. `lib/monitoring/options.ts` therefore switches every `dataCollection` category off; this is the version 11 equivalent of `sendDefaultPii: false`. Session Replay, User Feedback, tracing, logs, session counting, console capture and DOM click trails are not enabled. `lib/monitoring/scrub.mjs` then runs on every event: it removes user, cookies, headers, request bodies, query strings, local variables and extra data, and redacts emails, tokens, identifiers and query strings inside messages. Nicknames cannot be pattern matched, so every container that could hold one is removed instead. The SDK sends `infer_ip: never`.

**Location.** Sentry derives country, region and city from the sender's IP address even when *Prevent Storing of IP Addresses* is on; the 24 November preview test showed a city on a browser event. Browser reports are therefore relayed through `app/api/monitoring/route.ts` (the SDK `tunnel` option). The browser never connects to Sentry, no request header is forwarded, and Sentry sees the Netlify server's address. The browser sets its own User-Agent on the event so Sentry can still show browser, operating system and device. The Content Security Policy does not allow the Sentry host. The relay accepts only same-origin envelopes for this project's DSN that contain error events. As a second safeguard, add the Advanced Data Scrubbing rule below.

Do not add `Sentry.setUser`, free-form tags, extra data or new integrations without repeating the browser and server payload checks.

**Retention.** Sentry keeps error events for 30 days on its Developer (free) plan and 90 days on Team and Business plans. Retention is fixed when an event is ingested. Hikmah is on the Developer plan, so the public privacy page states 30 days. Update the page before upgrading the plan, and whenever Sentry's policy changes.

**Sentry project settings to apply once.** Security & Privacy: enable *Prevent Storing of IP Addresses* and keep *Data Scrubber* and *Use Default Scrubbers* on. Under Advanced Data Scrubbing add the rule `[Remove] [Anything] from [$user.geo.**]`, which Sentry documents as the way to remove geographic information. Leave Session Replay, tracing and uptime monitoring unused; uptime checks are stored outside the selected region. Record the data processing agreement and transfer basis with the other processor evidence.

**Configuration.** Values are listed in `.env.example`.

- `NEXT_PUBLIC_SENTRY_DSN` in Netlify, scopes Builds, Functions and Runtime. A DSN is not a secret, but it is configured in the environment only. Code accepts only `https://<key>@o<org>.ingest.de.sentry.io/<project>`; any other value disables reporting.
- `SENTRY_ORG` in Netlify, scopes Builds, Functions and Runtime.
- `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` in Netlify, Builds scope, token marked secret. Optional: they upload source maps for readable stack traces. Without them the build skips the upload.
- `SENTRY_ISSUES_TOKEN` in Netlify, scopes Functions and Runtime, marked secret. A read-only token with `event:read` for the Health tab. It is used only by `app/api/admin/health/route.ts` against `de.sentry.io` and never reaches the browser.
- `SENTRY_DSN` as a Supabase function secret on the production game function, plus `HIKMAH_ENVIRONMENT=preview` on a candidate function if one should report separately.

Reporting stays off wherever the DSN is absent. Apply the Sentry project settings above before configuring the DSN in Production.

### Admin Health tab

`/admin` → Health is available to administrators only; the game backend performs the check. It shows the latest unresolved Sentry issues, failed game API calls and sign-in or permission errors for the last 24 hours, the last privacy-maintenance run, and the live backend release against `backend/version.ts`.

The counters are hourly rows in the private `hikmah.site_settings` table under `health:h:…`, written by the Edge Function for requests that passed the server credential check. They hold a fixed vocabulary (kind, resource, action, status, count) and no player, session or address data. Privacy maintenance deletes them after 48 hours and records its own result under `health:maintenance`. No migration is required. Wrong passwords are checked by Supabase Auth in the browser and are not counted; use the Supabase Auth logs for those.

A frontend release ahead of the backend is safe: the tab shows the version warning and a notice that health data needs the matching Edge Function.

### Releasing the backend

The built bundle is about 117 KB. Deploy it by reference so that no tool has to retype it:

1. Run `pnpm run build:backend`, commit the result with the source change and push. Note the commit hash. CI must pass.
2. Deploy an entry file to `hikmah-api-candidate` that contains one line, `import "https://raw.githubusercontent.com/nuqatapp/hikmah/<commit>/supabase/functions/hikmah-api/index.js";`, together with the generated `deno.json`, with gateway JWT verification disabled. Supabase fetches the bundle once while deploying. Use the full commit hash, never a branch name, and only this repository.
3. Open the Deploy Preview and confirm a game API response is 200 with the expected `X-Hikmah-Backend-Version`.
4. Deploy the same two files to `hikmah-api-integrity`. The two functions should report the same bundle hash.
5. Publish the matching frontend, then open `/admin` → Health and confirm there is no red version warning. Complete the checks in step 6 of the coordinated release.
6. Rollback: deploy the entry file again with the previous release's commit hash (f067045 for `2026-11-22-integrity`). The site keeps working against the older backend; only the Health data is unavailable.

Function secrets such as `SENTRY_DSN` are set in the Supabase dashboard under Edge Functions → Secrets and apply to every function in the project. Uploading the bundle directly with the Supabase CLI (`supabase functions deploy <name> --project-ref vilgghdzyqdsvbaazphh --no-verify-jwt`) remains valid when a logged-in CLI is available.

The 27 November 2026 release followed these steps: candidate version 7 and production version 3 from commit 14df003.

## Signup protection rollout

The production release includes migration `20261122181220_require_verified_email_signup`. Apply it before enabling the Supabase **Before User Created** hook. The migration installs the function and its grants. Enabling the hook is a separate Auth dashboard action.

The signup route needs the matching backend's `signup-guard` resource. The older frontend also omits the client identifier required by the new game-creation limiter. Stage the matching backend alongside the current endpoint and switch the production frontend and its backend URL together, or use a coordinated maintenance window. Verify a fresh guest game and a disposable email signup on the production domain before enabling the hook. Then check email delivery, confirmation, return to the original invite, and a two-account match on the published site. Keep the older endpoint available until those checks are complete.

## Auth URL and email configuration

The live QA on 14 November 2026 found a confirmation link returning to `localhost:3000`. In Supabase Authentication → URL Configuration, set Site URL to `https://hikmahgame.com`. Allow the production callback and pinned preview URLs, including callback query parameters. The pinned preview pattern is `https://deploy-preview-1--hikmah-wisdom-games.netlify.app/**`; verify a callback containing `?next=` as well as its plain path. Preserve any other verified application callbacks. Do not use an unrestricted external-domain wildcard. The app also forwards root `?code=` returns through its normal PKCE callback, with safe `next` validation.

The operator confirmed receipt of both QA confirmation and password-reset emails. A further signup returned `over_email_send_rate_limit`. Verify custom SMTP configuration and the project's configured limits before public launch; do not disable email confirmation to work around the limit. Use an authenticated sender on the operator's domain, retain applicable processor/transfer evidence, and test the complete confirmation/reset return path after saving URL settings. No email password or SMTP secret belongs in chat or source code.

### Cross-browser email templates

After deploying the `/auth/confirm` landing page, install `supabase/templates/confirmation.html` as the hosted Confirm signup email and `supabase/templates/recovery.html` as Reset password. Suggested bilingual subjects: `Confirm your Hikmah email / تأكيد بريد حكمة` and `Reset your Hikmah password / تغيير كلمة مرور حكمة`. These files are not applied to the hosted project automatically by a frontend deployment.

The templates use Site URL and TokenHash. The recipient confirms the action with an explicit POST before `verifyOtp` consumes the token. No originating-browser PKCE cookie is required. A simple GET from an email scanner does not confirm or sign in; the verification route checks Origin, token format, allowed types and size, creates the session through Supabase and uses fixed local destinations. Keep link tracking disabled and test both templates after saving. Existing PKCE/OAuth callbacks remain supported for older messages. A QA email confirmed in a different browser can already be verified even if its old PKCE callback fails; check identity state before sending another email.

### Verified production release, 14 November 2026

PR 1 was merged as `100075aa04977acbd4bd964eecfa7d1e25822118`. Production Netlify deploy `6af838813e093aa947978cae` published at 13:32 Saudi time; the matching production `hikmah-api` became version 4 with the same compiled candidate digest and response version `2026-11-14-privacy-2`. Sixty production solo rounds passed across all three games and both languages. The live security suite and signed-in account consent/reward/export/avatar checks passed. The owner confirmed the newest QA email; password sign-in verified the account after its cross-browser PKCE callback failed. Real two-account multiplayer remains pending email capacity.

Netlify registered `privacy-maintenance` for `0 3 * * *` (06:00 Saudi time); this proves registration, not a completed scheduled run. Production proxy and scheduled function both have the existing Functions-scoped backend URL/token. Deployment metadata reports Netlify functions in `us-east-2`; Supabase is Frankfurt. The Supabase organization is currently Free, and the owner reports no outside backups/exports. Current plan documentation provides no automatic daily backups for Free and lists one-day API/database log retention; confirm actual dashboard changes before relying on these defaults. Do not describe backups as guaranteed. Preserve all 13 unlinked legacy profiles.

The latest Supabase security advisor reports leaked-password protection disabled. This optional provider feature requires Pro or above; do not incur an upgrade without the owner's decision. The app requests at least 12 characters, which does not substitute for provider-enforced compromised-password checks. Custom SMTP remains necessary; a retry again hit the sending limit.

### Final multiplayer and erasure verification

Both approved QA emails were confirmed. Six real production multiplayer matches completed 30 rounds across every game/language combination. Identical puzzle, host/start, concurrent-answer, duplicate-submit, final-score and saved-balance checks passed. PostgreSQL verification found one correct attempt and one winner award for each of the 30 rounds. A QA assertion initially expected internal wallet IDs in the readable export; that assertion was corrected to the actual minimal export fields and independently checked against the database.

Both disposable accounts were then erased through the live API. Auth/provider cleanup completed, old sessions became guests and the uploaded avatar returned 404. SQL found no remaining QA Auth/profile/consent/attempt/wallet/membership/host/winner identifiers; all 13 unlinked legacy profiles remained. The disclosed minimal completed-erasure status records remain for 30 days. Local QA passwords and cookies were cleared.

The owner created a Resend account and opened the pending `auth.hikmahgame.com` domain. The displayed sending region is Tokyo. Its actual required DNS records are one DKIM TXT and two CNAMEs; use the current dashboard values, not a generic older SPF/MX example. DNS and SMTP/template activation remain pending. Do not overwrite root website or mail-forwarding records. The essential-storage notice now occupies normal page flow so it cannot cover sign-in errors, buttons or keyboard focus.

### SMTP activation and real-token format fix

The three required DNS records were saved in Namecheap. Public DNS matches every provider value; the website addresses, www CNAME and root mail forwarding match the before-change snapshot. Resend now reports the domain Verified and Forge Ready. Open/click tracking is not configured. The default opportunistic recipient TLS policy remains; an encrypted-only policy was not enabled because the owner did not choose that availability tradeoff.

Supabase custom SMTP is enabled with `smtp.resend.com:465`, username `resend`, sender `noreply@auth.hikmahgame.com` and name `Hikmah / حكمة`. Its key is sending-only and restricted to this domain. No key is in source, reports or local files; the temporary clipboard and runtime variable were cleared. Supabase raised the email limit to 30/hour; the provider's own quota still applies. Both hosted email templates were replaced and their complete saved source was compared with the prepared HTML after reloading the editor. The first new signup request was accepted and the owner received the new-format link.

That real link exposed a validator error: Supabase hashes can carry a `pkce_` prefix, which the hex-only landing/POST validators rejected. The shared bounded URL-safe validator now keeps the opaque hash unchanged and delegates authenticity/expiry to Supabase. Runtime checks cover prefixed signup/recovery tokens without an originating-browser cookie, malformed hashes, upstream rejection, scanner GETs, replay and redirect isolation. Finish real confirmation/reset verification before declaring the email work complete. Public privacy wording now names Resend and its actual sending/storage locations, with its own updated date. The removed registration-status disclaimer must not be reinstated or replaced with an invented registration number.

## Native email confirmation form policy

The confirmation landing page uses `strict-origin` referrer metadata: only the site origin can be sent, never the token-bearing path/query. Do not replace this with `no-referrer` on the native POST landing page: browsers can then send `Origin: null`, which the verification route correctly rejects. The verification response still uses `no-referrer`. Preserve rejection of foreign, opaque and missing origins; verify a real browser button submission as well as the HTTP/runtime tests when changing this flow.

## Rights requests

Check the support inbox regularly. Record receipt date, request type, due date, identity-verification method, outcome, necessary retention exception and completion date in a restricted register. Do not copy passwords, identity documents or unnecessary account data into tickets.

Normally respond within 30 days under the Saudi PDPL implementing rules. Explain any legally available extension and any lawful retention exception. Verify a requester through the authenticated account or a proportionate alternative; verify a guardian's authority where needed. An email-verification plus attestation record alone does not establish legal guardianship in every case.

Account settings provide readable export and full erasure. Erasure first removes game data and identifiers in a transaction, then deletes private avatars and the Auth account. A failed provider cleanup stays pending for retry. Completed jobs retain a minimal status record for 30 days. Do not recreate erased data from backups. If a backup is restored for disaster recovery, reapply recorded erasures before allowing normal access.

## All-ages play

Guest play remains available to all ages. Accounts require a person with legal capacity or a legal guardian managing the account with their own verified email. Do not collect an exact birthday or identity document by default. A child's nickname, public results and optional photo can still be personal data. Use proportionate guardian verification and avoid identifying children in profile content. Review this process against Saudi requirements before describing it as legally verified.

## Provider, email and content evidence

Maintain a processor/transfer assessment covering Supabase (Frankfurt), Netlify (including U.S. infrastructure), Sentry error monitoring (event storage in Frankfurt, Germany; a U.S. company with organisation metadata in the United States; 30 day error retention on the Developer plan), Gmail support and enabled OAuth providers. Record contractual safeguards, applicable transfer mechanism, subprocessors, security measures, retention and the actual necessity of each data flow. Public disclosure alone does not satisfy transfer requirements.

Verify SMTP delivery, confirmation/reset templates, sender identity, session revocation and configured log/backup retention in the provider dashboards. Current application code sends no marketing campaigns. If marketing is added, obtain the applicable separate consent and implement a free working unsubscribe/suppression process before sending it.

The game currently has no monetary checkout, subscription or paid HR. Re-review total prices, invoices, cancellation/refund rights and renewals before adding payments. Do not add unsupported outcome claims or fabricated reviews.

Keep evidence of logo/content ownership and permission for imported wording or images. Software notices are served at `/third-party-notices.txt`; regenerate them after dependency changes. The selected design self-hosts unmodified Lalezar and Readex Pro WOFF2 files. Their SIL OFL licences and Fontsource source/version credits are served under `/assets/fonts/`; preserve these notices when changing typography.
