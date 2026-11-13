import {identity,type Actor} from './actor';
import {one,many,run,batch,profile,leaveRoom,GameError} from './service';
import {ACCOUNT_POLICY_VERSION,validateAccountConsent} from '../policy';

export function verifiedAccount(actor:Actor) {
  if(!actor.signed||!actor.authUserId)throw new GameError('Sign in with a verified account to continue.',401);
  return actor.authUserId;
}
export async function accountConsent(actor:Actor) {
  if(!actor.signed)return null;
  if(!actor.authUserId)return {accepted:false,version:ACCOUNT_POLICY_VERSION};
  const record=await one('SELECT capacity,relationship,accepted_at,terms_version FROM account_consents WHERE auth_user_id=? AND terms_version=?',actor.authUserId,ACCOUNT_POLICY_VERSION);
  return {accepted:!!record,version:ACCOUNT_POLICY_VERSION,...record};
}
export async function requireAccountConsent(actor:Actor) {
  verifiedAccount(actor);
  if(!(await accountConsent(actor))?.accepted)throw new GameError('Review the account terms and guardian choices before playing with an account.',403);
}
export async function acceptAccountConsent(value:Record<string,unknown>) {
  const actor=await identity(),authId=verifiedAccount(actor);
  let consent;
  try{consent=validateAccountConsent(value)}catch(e){throw new GameError((e as Error).message)}
  await run('INSERT OR IGNORE INTO account_consents(auth_user_id,terms_version,capacity,relationship,accepted_at,verification_method) VALUES(?,?,?,?,?,?)',authId,ACCOUNT_POLICY_VERSION,consent.capacity,consent.relationship,Date.now(),'verified_email_and_attestation');
  return accountConsent(actor);
}
export async function exportAccountData() {
  const actor=await identity(),authId=verifiedAccount(actor);
  return {
    exportedAt:new Date().toISOString(),
    accountId:authId,
    profile:await profile(actor.id),
    consents:await many('SELECT terms_version,capacity,relationship,accepted_at,verification_method FROM account_consents WHERE auth_user_id=?',authId),
    attempts:await many('SELECT round,correct,answer,elapsed,created_at FROM attempts WHERE user=? ORDER BY created_at',actor.id),
    wallet:await many('SELECT amount,reason,created_at FROM wallet WHERE user=? ORDER BY created_at',actor.id),
    reports:await many('SELECT content_id,message,status,created_at FROM reports WHERE user=? ORDER BY created_at',actor.id),
    games:await many('SELECT r.id,r.kind,r.locale,r.mode,r.status,r.total,r.created_at FROM rooms r JOIN members m ON m.room=r.id WHERE m.user=? ORDER BY r.created_at',actor.id),
  };
}
export async function requestAccountErasure(confirm:unknown) {
  const actor=await identity(),authId=verifiedAccount(actor);
  if(confirm!=='DELETE')throw new GameError('Type DELETE to confirm.');
  const p=await profile(actor.id);
  await run('INSERT OR IGNORE INTO account_erasure_jobs(auth_user_id,requested_at,status,avatar_path) VALUES(?,?,?,?)',authId,Date.now(),'pending',p?.avatar||null);
  const rooms=await many('SELECT r.id FROM rooms r JOIN members m ON m.room=r.id WHERE m.user=? AND m.left_at IS NULL',actor.id);
  for(const room of rooms)await leaveRoom(room.id,actor.id);
  const anonymousHost='deleted_'+crypto.randomUUID();
  await batch([
    ['DELETE FROM attempts WHERE user=?',[actor.id]],
    ['DELETE FROM wallet WHERE user=?',[actor.id]],
    ['DELETE FROM reports WHERE user=?',[actor.id]],
    ['UPDATE rounds SET winner=NULL WHERE winner=?',[actor.id]],
    ['UPDATE rooms SET host=? WHERE host=?',[anonymousHost,actor.id]],
    ['DELETE FROM members WHERE user=?',[actor.id]],
    ['DELETE FROM account_consents WHERE auth_user_id=?',[authId]],
    ["DELETE FROM site_settings WHERE key='admin_user' AND value=?",[actor.id]],
    ['DELETE FROM profiles WHERE id=?',[actor.id]],
  ]);
  return {erasureRequested:true};
}
