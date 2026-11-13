# Hikmah privacy and release operations

Operator: Areej Ali. Personal project, Jeddah, Saudi Arabia, without commercial registration. Contact: Nuqat.app@gmail.com. These facts were confirmed by the operator on 13 November 2026.

## Coordinated release

The frontend is deployed by Netlify from `nuqatapp/hikmah`. The game backend is a separate Supabase Edge Function. A frontend deploy does not update that function.

1. Require the game/privacy CI checks and a successful Netlify Deploy Preview. Verify legal pages, both languages/themes, mobile layouts, keyboard controls and error recovery there.
2. Before enabling destructive maintenance, confirm the provider's backup retention and recovery process. Preserve the 13 unlinked legacy game profiles until ownership is established; never merge by nickname.
3. Apply `supabase/migrations/20261113075118_privacy_account_lifecycle.sql` to the confirmed project `vilgghdzyqdsvbaazphh`. This is additive. Verify RLS and that `anon`/`authenticated` have no direct access to the three new private tables.
4. Run `pnpm run build:backend`. Deploy the generated `supabase/functions/hikmah-api/index.js` and `deno.json` to the existing `hikmah-api` function. Preserve its existing private server-token gate. Its gateway JWT setting is deliberately disabled because the function implements its own credential verification.
5. Publish the matching frontend promptly. Signed-in game actions require current account authorisation; an older frontend cannot complete that onboarding. Use a coordinated release window. Keep guest play available.
6. Verify `X-Hikmah-Backend-Version: 2026-11-13-privacy-1` on game API responses, a complete session in each mode/language, two-account multiplayer, export and erasure with disposable accounts, and measured request latency. Do not infer a successful backend release from the Netlify commit alone.
7. Confirm Netlify registered the daily `privacy-maintenance` scheduled function (03:00 UTC / 06:00 Saudi time) and its production runtime has `HIKMAH_BACKEND_URL` and `HIKMAH_BACKEND_TOKEN`. A failed run must be investigated; the next daily run retries durable pending jobs.

No secret belongs in a browser bundle or this document. Supabase needs its existing server-side DB URL and service-role key. Netlify needs its existing private proxy token. `HIKMAH_BACKEND_REGION` optionally overrides the default Frankfurt function routing.

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

Keep evidence of logo/content ownership and permission for imported wording or images. Software notices are served at `/third-party-notices.txt`; regenerate them after dependency changes. System font names do not mean the application distributes those font files.
