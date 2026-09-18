import {getCurrentUser} from '@/lib/auth';
import {cookies} from 'next/headers';
import type {Actor} from './game/actor';

// Only verified server identity is forwarded to the private backend.
export async function siteIdentity(): Promise<Actor> {
  const user = await getCurrentUser();
  if (user) return {id: user.userId, authUserId: user.authUserId, name: user.fullName || 'Player', signed: true};
  const jar = await cookies();
  let id = jar.get('hikmah_guest')?.value;
  if (!id || !/^g_[a-f0-9-]{36}$/.test(id)) {
    id = 'g_' + crypto.randomUUID();
    jar.set('hikmah_guest', id, {httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 * 30});
  }
  return {id, name: 'Guest', signed: false};
}
