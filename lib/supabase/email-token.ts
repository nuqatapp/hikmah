export function validEmailTokenHash(value:unknown):value is string {
  // Supabase can prefix hashes with pkce_. Keep the opaque value unchanged;
  // Supabase, rather than this shape check, verifies authenticity and expiry.
  return typeof value==='string'&&/^[A-Za-z0-9_-]{32,256}$/.test(value);
}
