'use client';
import Link from 'next/link';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { type Kind,type Locale,type Puzzle } from '@/lib/game/rules';
import {gameErrorText} from '@/lib/game/transport';
export type View='home'|'play'|'multiplayer'|'profile'|'leaderboard'|'settings'|'admin';
export type ActiveGame={id:string;kind:Kind;mode:'solo'|'multi'};
export type Profile={id:string;name:string;username:string;country:string;city:string;age_group:string;locale:Locale;avatar:string|null;balance:number;isAdmin:boolean};
export type Player={user:string;name:string;avatar:string|null;wins:number;last_seen:number;left_at:number|null};
export type RoomState={room:{id:string;code:string;kind:Kind;locale:Locale;mode:'solo'|'multi';status:string;host:string;total:number};round:{id:string;number:number;startedAt:number;endedAt:number|null;winner:string|null;outcome:string|null;puzzle:Puzzle;solution:string|null;explanation:string|null;submitted:boolean;guessesLeft:number|null;submittedChoice:number|null;correctChoice:number|null;deadline:number|null}|null;players:Player[];serverTime:number;me:string;profile:Profile|null;history:{number:number;winner:string|null;outcome:string}[]};
export type PuzzleLanguage=Locale|'auto';
export type Props={locale:Locale;t:(en:string,ar:string)=>string;questionLocale:Locale;puzzleLanguage:PuzzleLanguage;changePuzzleLanguage:(value:PuzzleLanguage)=>void;profile:Profile|null;signed:boolean;refresh:()=>Promise<void>;onProfileChange?:(profile:Profile|null)=>void};
export function isActiveGameConflict(message:string) {
 return message==='Finish or leave your current solo game first.'||message==='Finish or leave your current multi game first.';
}
export function StartGameError({error,t,active}:{error:string;t:Props['t'];active:ActiveGame[]}) {
 if(!isActiveGameConflict(error))return <>{gameErrorText(error,t)}</>;
 const game=active.find(game=>game.mode===(error.includes('solo')?'solo':'multi'));
 return <div className="flex-row">
  <span>{t('Resume your current game or leave it before starting a new one.','تابع لعبتك الحالية أو غادرها قبل بدء لعبة جديدة.')}</span>
  {game&&<Link className="play-link underline" href={'/play?id='+encodeURIComponent(game.id)}>{t('Resume game','تابع اللعبة')}</Link>}
 </div>;
}
export {gameApi as api,gameErrorText} from '@/lib/game/transport';
export function title(k:Kind,l:Locale){return {letters:l==='ar'?'الحروف الناقصة':'Missing Letters',mcq:l==='ar'?'اختيار من متعدد':'Multiple Choice',cryptogram:l==='ar'?'الشفرة':'Cryptogram'}[k]}
export function avatar(p:{name:string;avatar?:string|null}){return p.avatar?<img className="avatar" src={'/api/avatar?key='+encodeURIComponent(p.avatar)} alt=""/>:<span className="avatar">{p.name?.slice(0,1).toUpperCase()||'H'}</span>}
export function Loading({t}:{t:Props['t']}){return <div className="panel" role="status" aria-label={t("Loading","جارٍ التحميل")}><div className="skeleton" style={{width:'40%'}}/><div className="skeleton"/><div className="skeleton" style={{width:'70%'}}/></div>}
export function Picker({value,onChange,items,label}:{value:string;onChange:(v:string)=>void;items:[string,string][];label:string}){return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{items.map(([v,t])=><SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select>}
export function PuzzleLanguagePicker({t,puzzleLanguage,changePuzzleLanguage}:Pick<Props,'t'|'puzzleLanguage'|'changePuzzleLanguage'>){
 return <Picker label={t('Puzzle language','لغة الألغاز')} value={puzzleLanguage}
  onChange={value=>changePuzzleLanguage(value as PuzzleLanguage)}
  items={[['auto',t('Website language','لغة الموقع')],['en','English'],['ar','العربية']]}/>;
}
export const kinds:Kind[]=['letters','mcq','cryptogram'];
