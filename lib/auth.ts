import 'server-only';
import {cache} from 'react';
import {serverAuth} from './supabase/server';

export type CurrentUser = {
  userId: string;
  authUserId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

// Auth verifies the session; editable metadata is display text, never authority.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const client = await serverAuth();
  if (!client) return null;
  const {data: {user}, error} = await client.auth.getUser();
  if (error || !user || user.is_anonymous || !user.email_confirmed_at) return null;
  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || 'Player').slice(0,40);
  return {userId: 'sb_' + user.id, authUserId: user.id, displayName: name, fullName: name, email: user.email || ''};
});
