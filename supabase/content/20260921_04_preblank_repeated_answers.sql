-- Applied to production 21 Sep 2026. Data only workaround for the live engine, which blanks the first text match only.
-- For proverbs where the answer word appears twice, the later occurrence is stored already blanked, so the live engine shows every occurrence hidden.
-- Verified: the live engine output equals the patched engine output for all 21 rows, and the patched engine handles these stored prompts identically.

update hikmah.content set prompt='لا يُغسل الدم ب_____.', active=1 where id='letters-18689b2e778f';
update hikmah.content set prompt='لكل كلب يوم، ولكل قط يومان.', active=1 where id='letters-14a1e3d4f84e';
update hikmah.content set prompt='أن تملك ولا تحتاج خير من أن _____ ولا تملك.', active=1 where id='letters-fd93e4b4d093';
update hikmah.content set prompt='الأحمق الظريف خير من _____ الأحمق.', active=1 where id='letters-8adf1fab0d39';
update hikmah.content set prompt='الشباب يضيع على _____.', active=1 where id='letters-b7c6e7ac3b84';
update hikmah.content set prompt='أعز من الولد ولد _____', active=1 where id='letters-3724243f18a2';
update hikmah.content set prompt='ليس كل جميل خيرًا لكن الخير _____ دائمًا.', active=1 where id='letters-964f47707eca';
update hikmah.content set prompt='Let bygones be _____.', active=1 where id='letters-9c4ef2f15766';
update hikmah.content set prompt='Never say _____.', active=1 where id='letters-f03e12b25610';
update hikmah.content set prompt='The enemy of my _____ is my friend.', active=1 where id='letters-36d9cbc9ef10';
update hikmah.content set prompt='Deep doubts, deep wisdom; small doubts, little _____.', active=1 where id='letters-0f25096ed6fa';
update hikmah.content set prompt='What goes around comes _____.', active=1 where id='letters-efc25c293064';
update hikmah.content set prompt='Easy come, _____ go.', active=1 where id='letters-f208abc8cf6b';
update hikmah.content set prompt='To the world you may be one person, but to one person you may be the _____.', active=1 where id='letters-71462e1ebc51';
update hikmah.content set prompt='When the going gets tough, the _____ get going.', active=1 where id='letters-03e1c9e983b4';
update hikmah.content set prompt='A penny saved is a _____ earned.', active=1 where id='letters-f4dd4445f1fd';
update hikmah.content set prompt='An army of sheep led by a lion is better than an army of lions led by a _____ (Arabic).', active=1 where id='letters-a16afb3ee37d';
update hikmah.content set prompt='Better to have it and not need it than to _____ it and not have it.', active=1 where id='letters-60a0911c710a';
update hikmah.content set prompt='A beautiful person is not always good, but a good person is always _____ (Hungarian).', active=1 where id='letters-28bb092f4089';
update hikmah.content set prompt='He who lives by the sword shall die by the _____.', active=1 where id='letters-10a14a3a7001';
update hikmah.content set prompt='من عاش بالسيف مات ب_____.', active=1 where id='letters-990455dac9d3';
