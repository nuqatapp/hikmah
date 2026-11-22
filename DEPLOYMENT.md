# Hikmah deployment

Production pointers verified on 2026-11-22. The verification and credential history below dates to September 2026.

- Live site: https://hikmahgame.com
- Netlify project: hikmah-wisdom-games, bfba38b2-602d-4890-8048-d6c6a0e4f7ea.
- Production deploy: 6afebc95a1b7bd7f3439f923, ready.
- Public source: https://github.com/nuqatapp/hikmah, main. Publication was explicitly approved by the owner.
- Supabase: vilgghdzyqdsvbaazphh, private hikmah schema, hikmah-api Edge Function version 6. The deployed game API reports `2026-11-19-signup` until the integrity release is deployed.

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

## Remaining setup

1. Supabase Auth URL Configuration: set Site URL to https://hikmahgame.com and allow https://hikmahgame.com/auth/callback**. Keep the redirect pattern restricted to the exact host; the suffix includes password recovery query strings.
2. Google sign-in: configure the owner's Google Cloud OAuth Client ID and Client Secret in Supabase. Google callback: https://vilgghdzyqdsvbaazphh.supabase.co/auth/v1/callback. Keep the secret out of frontend code and GitHub.
3. Configure production SMTP for confirmation and recovery emails. Keep email confirmation enabled.
4. After the owner creates a verified account, explicitly link the existing legacy profile through profiles.auth_user_id without replacing its game data. New signups never become administrators automatically.
5. Netlify builds production from `nuqatapp/hikmah` on `main` and builds Deploy Previews for pull requests. Review the preview and follow the [coordinated release procedure](docs/OPERATIONS.md#coordinated-release) for backend changes.

Supabase's plugin does not expose Auth URL, Google provider, or SMTP configuration. Verify the current auth settings in the Supabase dashboard before changing them.
