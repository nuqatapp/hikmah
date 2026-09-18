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
