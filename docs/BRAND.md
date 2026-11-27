# Hikmah brand in the app

The app uses the Hikmah brand kit, version 1.0 (27 November 2026). The kit itself (brand book, every logo layout, fonts, social images) is kept by the operator outside this repository. Only the files the site serves are copied here, unmodified.

## Files

| Site path | Kit source | Use |
| --- | --- | --- |
| `public/brand/hikmah_lockup-mark-right_color.svg` | `logo/svg/` | Header and sign-in pages in Arabic (primary lockup) |
| `public/brand/hikmah_lockup-mark-left_color.svg` | `logo/svg/` | Header and sign-in pages in English (Latin-first lockup) |
| `public/brand/hikmah_lockup-mark-right_night.svg`, `hikmah_lockup-mark-left_night.svg` | Derived from the two colour lockups | The same lockups in dark mode |
| `public/brand/hikmah_lockup-mark-right_white.svg`, `hikmah_lockup-mark-left_white.svg` | `logo/svg/` | Kept for single-colour use; not shown by the site |
| `public/brand/hikmah_symbol_color.svg` | `logo/svg/` | Error and not-found pages |
| `app/favicon.ico`, `public/favicon.svg` | `icons/` | Browser tab icon |
| `public/apple-touch-icon.png` | `icons/apple-touch-icon.png` | iOS home screen |
| `public/icon-512.png` | `icons/play-store-512.png` | Web app manifest, also the maskable icon |
| `public/favicon.png` | `icons/favicon.svg` rendered at 192 px | Web app manifest |
| `public/share.png` | `social/og-1200x630.png` | Link previews |

`components/hikmah/brand-logo.tsx` draws the logo. `app/layout.tsx` and `app/manifest.ts` reference the icons.

## Kit rules to keep when changing the app

- The logo files are outlined vectors, used as supplied. Never retype the logo in a font, recolour, rotate, stretch, mirror for right-to-left, or add shadows.
- On Day Paper the colour lockup is shown. On Night Ink the board keeps its colours and the names are Day Paper, by the operator's decision of 27 November 2026 ("the tiles stay bright on dark ink"). The `_night` files are not in kit 1.0: they are the colour lockups with the fill of the two name paths changed from `#181B2E` to `#F8F3EA` and nothing else. Add them to the next kit version, and regenerate them if the lockups change.
- The header logo is 54 px high, 44 px on phones; the kit's minimum on screen is 28 px.
- Colours in `app/playful.css` are the kit palette: Day Paper `#F8F3EA`, Night Ink `#181B2E`, Spark Orange `#F56736`, Mint `#ADDFCA`, Noon Sun `#FBD366`, Clear Sky `#A9D9F4`, Day Card `#FFFDF8`, Night Card `#24283F`, Ember `#FF996E`, Deep Orange `#CC421C`.
- Orange text on paper should use Deep Orange (`--accent-text`) and only at 24 px or larger; text on Spark Orange is Night Ink. Existing screens were not audited against this rule when the kit was applied.
- Headlines use Lalezar and body text Readex Pro, both self-hosted under the SIL Open Font License.

## Updating

Replace the files above from a new kit version, then raise the `?v=` number on the icon and share image links in `app/layout.tsx` so browsers and social networks fetch the new files. The hosted Supabase email templates are separate and are not changed by a site deploy.
