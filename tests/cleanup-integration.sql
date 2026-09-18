-- Run only after the explicit integration tests finish.
-- Deletes synthetic fixtures; never truncates tables or touches real players.
BEGIN;
DELETE FROM hikmah.rooms WHERE host LIKE 'integration-20260916-%';
DELETE FROM hikmah.reports WHERE "user" LIKE 'integration-20260916-%';
DELETE FROM hikmah.attempts WHERE "user" LIKE 'integration-20260916-%';
DELETE FROM hikmah.members WHERE "user" LIKE 'integration-20260916-%';
DELETE FROM hikmah.wallet WHERE "user" LIKE 'integration-20260916-%';
DELETE FROM hikmah.profiles WHERE id LIKE 'integration-20260916-%';
DELETE FROM hikmah.site_settings WHERE key = 'admin_user' AND value LIKE 'integration-20260916-%';
COMMIT;
