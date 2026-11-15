# Third-party notices

Full production-dependency notices are included in [public/third-party-notices.txt](public/third-party-notices.txt). The deployed site serves the same file at `/third-party-notices.txt`.

Lalezar and Readex Pro font binaries are served locally under the SIL Open Font License 1.1. Their unmodified licence notices and source credits are included in [public/assets/fonts/CREDITS.md](public/assets/fonts/CREDITS.md). The operator confirmed ownership of the game and domain on 13 November 2026. Logo and puzzle provenance remain the operator’s responsibility; report rights concerns to Nuqat.app@gmail.com.

Regenerate after dependency changes using `pnpm licenses list --prod --json`, then `node tools/generate-notices.mjs <inventory.json>`.
