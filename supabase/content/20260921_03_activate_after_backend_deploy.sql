-- Run ONLY after the patched hikmah-api edge function is live (lib/game/rules.ts whole-word blank).
-- These 2 proverbs cannot be fixed by data: the answer first appears inside another word (kingdom, تأخيرة).
update hikmah.content set active=1 where active=0 and id in ('letters-f1dfc86d76ba','letters-7d72c9c86947');
