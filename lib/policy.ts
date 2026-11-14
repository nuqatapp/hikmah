export const ACCOUNT_POLICY_VERSION='2026-11-13';
export type AccountCapacity='self'|'guardian';
export function validateAccountConsent(value:Record<string,unknown>) {
  if(value.version!==ACCOUNT_POLICY_VERSION||value.accepted!==true||value.legalCapacity!==true)
    throw new Error('Read and accept the current terms and confirm legal capacity.');
  if(value.capacity!=='self'&&value.capacity!=='guardian')throw new Error('Choose who manages this account.');
  if(value.capacity==='guardian'&&(value.childDataConsent!==true||!['parent','legal_guardian'].includes(String(value.relationship))))
    throw new Error('A legal guardian must confirm their authority and authorise the child’s account data.');
  return {capacity:value.capacity as AccountCapacity,relationship:value.capacity==='guardian'?String(value.relationship):null};
}
