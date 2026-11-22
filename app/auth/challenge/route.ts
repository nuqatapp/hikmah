import {signupChallenge} from '@/lib/signup-challenge';
export async function GET(){
  try{return Response.json(await signupChallenge(),{headers:{'Cache-Control':'no-store'}})}
  catch{return Response.json({error:'Verification unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
