import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {authConfig, safeNext} from '@/lib/supabase/config';
import {AuthForm} from '@/components/hikmah/auth-form';
export const dynamic = 'force-dynamic';
export default async function LoginPage({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const params = await searchParams;
  const next = safeNext(params.next || params.return_to);
  if (await getCurrentUser()) redirect(next === '/login' ? '/' : next);
  const config = authConfig();
  let google = false;
  if (config) {
    try {
      const response = await fetch(config.url + '/auth/v1/settings', {headers: {apikey: config.key}, next: {revalidate: 60}, signal: AbortSignal.timeout(5000)});
      if (response.ok) google = Boolean((await response.json()).external?.google);
    } catch {}
  }
  return <AuthForm configured={!!config} google={google} next={next} callbackError={params.error === 'callback'} />;
}
