export function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? {url, key} : null;
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/';
  try {
    const parsed = new URL(value, 'https://hikmah.invalid');
    return parsed.origin === 'https://hikmah.invalid' ? parsed.pathname + parsed.search + parsed.hash : '/';
  } catch { return '/'; }
}
