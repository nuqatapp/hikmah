import type {Locale} from './rules';

// One request per action. Never automatically replay a possibly committed move.
export async function gameApi(action:string,body?:Record<string,unknown>,query?:Record<string,string>,locale?:Locale){
 const ar=(locale||(typeof document!=='undefined'?document.documentElement.lang:'en'))==='ar';
 const unavailable=ar?'خدمة اللعبة غير متاحة مؤقتًا. حاول مرة أخرى.':'The game service is temporarily unavailable. Please try again.';
 let response:Response;
 try{
  response=await fetch('/api/game'+(body?'':'?'+new URLSearchParams({action,...query})),{
   ...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body})}:{cache:'no-store' as RequestCache}),
   signal:AbortSignal.timeout(30_000),
  });
 }catch{throw new Error(ar?'تعذر الاتصال باللعبة. تحقق من اتصالك وحاول مرة أخرى.':'Could not reach the game. Check your connection and try again.')}
 if(response.status>=500)throw new Error(unavailable);
 let data;
 try{data=await response.json()}catch{throw new Error(unavailable)}
 if(!response.ok)throw new Error(data?.error||(ar?'تعذر تنفيذ الطلب. حاول مرة أخرى.':'Could not complete the request. Please try again.'));
 return data;
}
