export type Kind='mcq'|'letters'|'cryptogram';
export type Locale='en'|'ar';
export type Content={id:string;kind:Kind;locale:Locale;prompt:string;answer:string;choices:string[];clues:{word:string;hint:string}[];explanation:string};
export type Token={code:number|null;symbol?:string};
export type Puzzle={id:string;kind:Kind;locale:Locale;prompt:string;choices:string[];bank?:string[];length?:number;tokens?:Token[];clues?:{hint:string;tokens:Token[]}[];revealed?:Record<string,string>};
export type Snapshot=Content & {codes?:Record<string,number>;bank?:string[]};
export const ROUND_SECONDS:Record<Kind,number>={mcq:45,letters:90,cryptogram:180};
export const POINTS:Record<Kind,number>={mcq:10,letters:15,cryptogram:20};
export function normalize(v:string){return v.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toUpperCase().trim();}
export function reward(ms:number){const s=ms/1000;return 2+(s<=5?5:s<=10?3:s<=20?2:1);}
export function shuffle<T>(arr:T[]):T[]{const a=[...arr];for(let i=a.length-1;i>0;i--){const r=new Uint32Array(1);crypto.getRandomValues(r);const j=r[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function snapshot(c:Content):Snapshot{
 const s:Snapshot=JSON.parse(JSON.stringify(c));
 if(c.kind==='mcq'){const order=shuffle(c.choices.map((_,i)=>i));s.choices=order.map(i=>c.choices[i]);s.answer=String(order.indexOf(Number(c.answer)));}
 if(c.kind==='letters')s.bank=shuffle(Array.from(normalize(c.answer)));
 if(c.kind==='cryptogram'){const chars=Array.from(new Set(Array.from(normalize([c.prompt,...c.clues.map(c=>c.word)].join(' '))).filter(c=>/\p{L}/u.test(c))));const nums=shuffle(chars.map((_,i)=>i+1));s.codes=Object.fromEntries(chars.map((c,i)=>[c,nums[i]]));}
 return s;
}
export function publicPuzzle(s:Snapshot):Puzzle{
 const p:Puzzle={id:s.id,kind:s.kind,locale:s.locale,prompt:s.prompt,choices:s.choices};
 if(s.kind==='letters'){const escaped=s.answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');p.prompt=s.prompt.replace(new RegExp(escaped,'iu'),'_____');p.bank=s.bank;p.length=Array.from(normalize(s.answer)).length;}
 if(s.kind==='cryptogram'){const tokens=(v:string):Token[]=>Array.from(normalize(v)).map(c=>s.codes?.[c]?{code:s.codes[c]}:{code:null,symbol:c});p.prompt='';p.tokens=tokens(s.prompt);p.clues=s.clues.map(c=>({hint:c.hint,tokens:tokens(c.word)}));}
 return p;
}
export function checkAnswer(s:Snapshot,answer:unknown):boolean{
 if(s.kind==='mcq')return Number.isInteger(answer)&&String(answer)===s.answer;
 if(s.kind==='letters')return typeof answer==='string'&&normalize(answer)===normalize(s.answer);
 if(!answer||typeof answer!=='object'||Array.isArray(answer))return false;
 const m=answer as Record<string,unknown>;
 return Array.from(normalize(s.prompt)).every(c=>!s.codes?.[c]||(typeof m[s.codes[c]]==='string'&&normalize(m[s.codes[c]] as string)===c));
}
export function solution(s:Snapshot){return s.kind==='mcq'?s.choices[Number(s.answer)]:s.answer;}
