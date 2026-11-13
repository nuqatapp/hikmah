# Third-party notices

Full production-dependency notices are included in [public/third-party-notices.txt](public/third-party-notices.txt). The deployed site serves the same file at `/third-party-notices.txt`.

Fonts use device/system font stacks; no font binaries are distributed by the app. The operator confirmed ownership of the game and domain on 13 November 2026. Logo and puzzle provenance remain the operator’s responsibility; report rights concerns to Nuqat.app@gmail.com.

Regenerate after dependency changes using `pnpm licenses list --prod --json`, then `node tools/generate-notices.mjs <inventory.json>`.
