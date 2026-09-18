import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {AuthForm} from '@/components/hikmah/auth-form';
export const dynamic = 'force-dynamic';
export default async function ResetPasswordPage() {
  if (!await getCurrentUser()) redirect('/login?error=callback');
  return <AuthForm configured google={false} next="/" reset />;
}
