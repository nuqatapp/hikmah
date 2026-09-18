# Hikmah deployment

Netlify project: hikmah-wisdom-games (bfba38b2-602d-4890-8048-d6c6a0e4f7ea).
GitHub: https://github.com/nuqatapp/hikmah
Supabase: vilgghdzyqdsvbaazphh. Database schema: hikmah. Edge function: hikmah-api.

## Completed preparation

- Standard Next.js production build and Netlify configuration.
- Email/password and Google authentication code, session validation and recovery.
- Dedicated Netlify backend credential, separate from Sites.
- Existing player, administrator assignment, puzzles and HR balances preserved.
- No automatic first-user administrator promotion.
- Production build, 90 game rounds, guest runtime and mocked Auth security tests passed.

## Provider settings still required

1. In Supabase Auth URL Configuration, set Site URL to the final Netlify HTTPS URL and add its /auth/callback** redirect pattern, scoped to that exact host. This includes the reset-password callback query string.
2. Enable Google under Supabase Auth providers using the owner's Google Cloud OAuth Client ID and Client Secret. Google redirect URI: https://vilgghdzyqdsvbaazphh.supabase.co/auth/v1/callback. Do not put the secret in frontend code or GitHub.
3. Configure a production SMTP service for confirmation and recovery emails. Keep email confirmation enabled.
4. After the owner creates a verified account, explicitly link the existing legacy profile to that Auth UUID without overwriting existing account data. Administrator rights stay with the existing profile until this is done.
5. Connect Netlify continuous deployment to nuqatapp/hikmah, branch main, if desired. Upload deployments do not establish Git-based deployment automatically.
6. Add the intended game domain to this Netlify project and update DNS and Supabase redirect settings. The existing nuqat.app website is a different project and must not be replaced without an explicit decision.

## Verification limits

Email delivery, Google consent and production authenticated multiplayer need end-to-end checks after provider setup. Local Auth tests use a mock and do not establish that external providers are configured. Existing data has not been imported again or cleared.

## Migration progress

The backend is deployed as Edge Function version 3. Netlify's environment updater returned success messages, but those messages did not establish that all variables reached the runtime. Use live checks as the source of truth.

On 2026-09-18, the owner explicitly approved publication to the public repository nuqatapp/hikmah and storing the private backend credential in Netlify production with default scope. The application source is now on GitHub main, initially published in commit 281137e647655adf7c6840d2beed151ab33373d4. Production credentials are excluded from source. GitHub and Netlify are not yet connected for automatic deployments.

## Netlify production

Live URL: https://hikmah-wisdom-games.netlify.app
Production deploy: 6aad1ab8396131444c6c41fc, ready. The first upload omitted the automatic adapter, so netlify.toml now declares @netlify/plugin-nextjs explicitly. The corrected deployment includes the Next.js server handler and edge middleware.

Live verification on 2026-09-18 passed all eight page routes. The email login form loads. The game dashboard API still returns 503, so gameplay on this deployment is not ready. The smoke test stopped before creating any room or saving an answer.

A new dedicated credential, netlify-production-20260918, is registered in the private database. A direct backend request with it returned HTTP 200, 80 puzzles, and an unsigned guest identity. No existing player or Sites credential was changed.

Netlify's connector reports "upserted" even when its underlying create request fails. Attempts to store a marked secret in production with all scopes, and then Builds plus Functions scopes, were followed by deployment checks; the game connection remains unresolved. Netlify documents that granular scopes require Pro or Enterprise, while marked secrets cannot use the Post processing scope included in the default all-scope setting.

Automatic approval review rejected storing the credential as a standard unmarked environment variable. That change was not applied. The owner then explicitly required secret storage with no exposure. Preserve this requirement: HIKMAH_BACKEND_TOKEN must have Contains secret values enabled, a production-only value, and the narrowest supported server scope. Do not use an unmarked variable as a workaround, and never put the credential in source or NEXT_PUBLIC_ variables. Secret masking is distinct from encryption at rest, which applies to all Netlify environment variables.

The Netlify team was rechecked and is on the Free plan. Netlify's pricing table explicitly includes Secrets Controller on Free; do not claim an upgrade is required for masking itself. Granular environment scope selection is listed for Pro and Enterprise. A masked production write using Builds, Functions and Runtime, excluding prohibited Post processing, was blocked by automatic approval review because Runtime would broaden access beyond server functions. It was not applied. Functions-only provisioning has not been verified successfully. A paid plan change requires a separate owner decision; no plan upgrade has been made.

References: https://docs.netlify.com/build/environment-variables/overview/ and https://docs.netlify.com/build/environment-variables/secrets-controller/

Supabase dashboard access in the connected browser requires sign-in. No Auth URL, Google provider, or SMTP changes have been applied through that dashboard. The Supabase plugin does not expose these Auth configuration operations.
