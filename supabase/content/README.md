# Content imports

Puzzle data loaded into `hikmah.content` outside the 80 seed puzzles in `lib/game/seed.json`.
The seed file and the local tests are intentionally unchanged and still expect 80 puzzles.

| File | What it does | State in production |
|---|---|---|
| `20260921_01_import_letters_cryptograms.sql` | 553 Missing Letters proverbs, 44 cryptograms | Applied 21 Sep 2026 |
| `20260921_02_import_mcq_and_held_letters.sql` | 197 general knowledge MCQ, 11 proverbs, 23 proverbs staged inactive | Applied 21 Sep 2026 |
| `20260921_04_preblank_repeated_answers.sql` | Activates 21 of the staged proverbs by storing the repeated answer already blanked | Applied 21 Sep 2026 |
| `20260921_03_activate_after_backend_deploy.sql` | Activates the last 2 staged proverbs (kingdom, تأخيرة) | Run after the patched `hikmah-api` is deployed |

All files are idempotent (`on conflict (id) do nothing`). Imported ids look like `letters-<12 hex>`, `cryptogram-<12 hex>`, `mcq-<12 hex>`.

Roll back an import without deleting history:

```sql
update hikmah.content set active=0 where id ~ '^(letters|cryptogram|mcq)-[0-9a-f]{12}$';
```
