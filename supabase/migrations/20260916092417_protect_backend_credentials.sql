-- Explicit deny policy documents that no application role reads server hashes.
-- Only the privileged, built-in Supabase Edge connection checks this table.
CREATE POLICY deny_client_credentials ON hikmah.server_credentials
  FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
