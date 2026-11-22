export function validEmailTokenHash(value:unknown):value is string {
  // Supabase can prefix hashes with pkce_. Keep the opaque value unchanged;
  // Supabase, rather than this shape check, verifies authenticity and expiry.
  return typeof value==='string'&&/^[A-Za-z0-9_-]{32,256}$/.test(value);
}

export function readSignupMarker(value:string|undefined):{userId:string;next:string|null}|null{
  if(!value)return null;
  if(/^[a-f0-9-]{36}$/i.test(value))return {userId:value,next:null};
  try{
    const parsed=JSON.parse(value);
    if(typeof parsed?.userId==='string'&&typeof parsed.next==='string')return parsed;
  }catch{}
  return null;
}

export const signupBrowserCookie=process.env.NODE_ENV==='production'?'__Host-hikmah_signup':'hikmah_signup';
