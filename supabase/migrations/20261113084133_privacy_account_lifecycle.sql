-- Additive privacy records. Existing profiles, content and balances are preserved.
CREATE TABLE hikmah.account_consents (
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  capacity text NOT NULL CHECK (capacity IN ('self','guardian')),
  relationship text CHECK (relationship IN ('parent','legal_guardian')),
  accepted_at bigint NOT NULL,
  verification_method text NOT NULL DEFAULT 'verified_email_and_attestation',
  PRIMARY KEY (auth_user_id,terms_version),
  CHECK ((capacity='self' AND relationship IS NULL) OR (capacity='guardian' AND relationship IS NOT NULL))
);
ALTER TABLE hikmah.account_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hikmah.account_consents FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON hikmah.account_consents TO hikmah_server;
CREATE POLICY server_consent_records ON hikmah.account_consents FOR ALL TO hikmah_server USING(true) WITH CHECK(true);

-- Survives Auth deletion until cleanup has completed; contains no email/name.
CREATE TABLE hikmah.account_erasure_jobs (
  auth_user_id uuid PRIMARY KEY,
  requested_at bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),
  avatar_path text,
  completed_at bigint,
  attempts integer NOT NULL DEFAULT 0,
  last_error_code text
);
ALTER TABLE hikmah.account_erasure_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hikmah.account_erasure_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON hikmah.account_erasure_jobs TO hikmah_server;
CREATE POLICY server_erasure_jobs ON hikmah.account_erasure_jobs FOR ALL TO hikmah_server USING(true) WITH CHECK(true);
CREATE INDEX erasure_pending_requests ON hikmah.account_erasure_jobs(requested_at) WHERE status='pending';

CREATE TABLE hikmah.storage_deletion_jobs (
  path text PRIMARY KEY,
  requested_at bigint NOT NULL,
  attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE hikmah.storage_deletion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hikmah.storage_deletion_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON hikmah.storage_deletion_jobs TO hikmah_server;
CREATE POLICY server_storage_cleanup ON hikmah.storage_deletion_jobs FOR ALL TO hikmah_server USING(true) WITH CHECK(true);
