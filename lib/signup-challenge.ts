import 'server-only';
import {createChallenge,randomInt,verifySolution} from 'altcha-lib';
import {deriveKey} from 'altcha-lib/algorithms/pbkdf2';
import {backendToken,keyedDigest} from './request-guard';

function signingKeys(){
  const token=backendToken();
  if(!token)throw new Error('Signup verification unavailable');
  return {hmacSignatureSecret:keyedDigest(token,'captcha','challenge'),hmacKeySignatureSecret:keyedDigest(token,'captcha','solution')};
}
export function signupChallenge(){
  return createChallenge({...signingKeys(),deriveKey,algorithm:'PBKDF2/SHA-256',cost:1500,counter:randomInt(500,1500),expiresAt:new Date(Date.now()+300_000)});
}
export async function verifySignupChallenge(encoded:unknown):Promise<string|null>{
  const keys=signingKeys();
  if(typeof encoded!=='string'||encoded.length>3000)return null;
  try{
    const {challenge,solution}=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
    if(typeof challenge?.signature!=='string'||!challenge.parameters?.expiresAt||!solution)return null;
    const result=await verifySolution({challenge,solution,deriveKey,...keys});
    return result.verified?challenge.signature:null;
  }catch{return null}
}
