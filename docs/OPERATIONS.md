# Hikmah privacy and release operations

Operator: Areej Ali. Personal project, Jeddah, Saudi Arabia, without commercial registration. Contact: Nuqat.app@gmail.com. These facts were confirmed by the operator on 13 November 2026.

## Coordinated release

The frontend is deployed by Netlify from `nuqatapp/hikmah`. The game backend is a separate Supabase Edge Function. A frontend deploy does not update that function.

1. Require the game/privacy CI checks and a successful Netlify Deploy Preview. Verify legal pages, both languages/themes, mobile layouts, keyboard controls and error recovery there.
2. Before enabling destructive maintenance, confirm the provider's backup retention and recovery process. Preserve the 13 unlinked legacy game profiles until ownership is established; never merge by nickname.
3. Migration `20261113084133_privacy_account_lifecycle` was applied to the confirmed project `vilgghdzyqdsvbaazphh` on 13 November 2026. It is additive. RLS is enabled on all three new private tables; verified `anon`/`authenticated` access is denied. Existing records were preserved.
   The same backend is deployed separately as `hikmah-api-candidate` for preview validation. Configure `HIKMAH_PREVIEW_BACKEND_URL` and the secret `HIKMAH_PREVIEW_BACKEND_TOKEN` in the Netlify Deploy Previews context only, with Functions scope. Provision only its SHA-256 hash in the private `hikmah.server_credentials` table. Production continues using `HIKMAH_BACKEND_URL` and `HIKMAH_BACKEND_TOKEN`; never overwrite the Production secret to fix a preview. The preview credential can be revoked independently when no longer needed.
4. Run `pnpm run build:backend`. Deploy the generated `supabase/functions/hikmah-api/index.js` and `deno.json` to the existing `hikmah-api` function. Preserve its existing private server-token gate. Its gateway JWT setting is deliberately disabled because the function implements its own credential verification.
5. Publish the matching frontend promptly. Signed-in game actions require current account authorisation; an older frontend cannot complete that onboarding. Use a coordinated release window. Keep guest play available.
6. Verify `X-Hikmah-Backend-Version: 2026-11-14-privacy-2` on game API responses, a complete session in each mode/language, two-account multiplayer, export and erasure with disposable accounts, and measured request latency. Do not infer a successful backend release from the Netlify commit alone.
7. Confirm Netlify registered the daily `privacy-maintenance` scheduled function (03:00 UTC / 06:00 Saudi time) and its production runtime has `HIKMAH_BACKEND_URL` and `HIKMAH_BACKEND_TOKEN`. A failed run must be investigated; the next daily run retries durable pending jobs.

No secret belongs in a browser bundle or this document. Supabase needs its existing server-side DB URL and service-role key. Netlify needs its existing private proxy token. `HIKMAH_BACKEND_REGION` optionally overrides the default Frankfurt function routing.

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

## Rights requests

Check the support inbox regularly. Record receipt date, request type, due date, identity-verification method, outcome, necessary retention exception and completion date in a restricted register. Do not copy passwords, identity documents or unnecessary account data into tickets.

Normally respond within 30 days under the Saudi PDPL implementing rules. Explain any legally available extension and any lawful retention exception. Verify a requester through the authenticated account or a proportionate alternative; verify a guardian's authority where needed. An email-verification plus attestation record alone does not establish legal guardianship in every case.

Account settings provide readable export and full erasure. Erasure first removes game data and identifiers in a transaction, then deletes private avatars and the Auth account. A failed provider cleanup stays pending for retry. Completed jobs retain a minimal status record for 30 days. Do not recreate erased data from backups. If a backup is restored for disaster recovery, reapply recorded erasures before allowing normal access.

## All-ages play

Guest play remains available to all ages. Accounts require a person with legal capacity or a legal guardian managing the account with their own verified email. Do not collect an exact birthday or identity document by default. A child's nickname, public results and optional photo can still be personal data. Use proportionate guardian verification and avoid identifying children in profile content. Review this process against Saudi requirements before describing it as legally verified.

## Provider, email and content evidence

Maintain a processor/transfer assessment covering Supabase (Frankfurt), Netlify (including U.S. infrastructure), Gmail support and enabled OAuth providers. Record contractual safeguards, applicable transfer mechanism, subprocessors, security measures, retention and the actual necessity of each data flow. Public disclosure alone does not satisfy transfer requirements.

Verify SMTP delivery, confirmation/reset templates, sender identity, session revocation and configured log/backup retention in the provider dashboards. Current application code sends no marketing campaigns. If marketing is added, obtain the applicable separate consent and implement a free working unsubscribe/suppression process before sending it.

The game currently has no monetary checkout, subscription or paid HR. Re-review total prices, invoices, cancellation/refund rights and renewals before adding payments. Do not add unsupported outcome claims or fabricated reviews.

Keep evidence of logo/content ownership and permission for imported wording or images. Software notices are served at `/third-party-notices.txt`; regenerate them after dependency changes. The selected design self-hosts unmodified Lalezar and Readex Pro WOFF2 files. Their SIL OFL licences and Fontsource source/version credits are served under `/assets/fonts/`; preserve these notices when changing typography.
