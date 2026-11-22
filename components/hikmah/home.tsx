'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {type Kind,type Locale} from '@/lib/game/rules';
import {ArrowRight,Check,Coins,Globe,User,Users} from 'lucide-react';
import {useState} from 'react';
import {api,isActiveGameConflict,kinds,PuzzleLanguagePicker,StartGameError,title,type ActiveGame,type Props} from './shared';

export function GameArt({kind,locale}:{kind:Kind;locale:Locale}) {
 return <div className={'game-art art-'+kind} aria-hidden="true">
  {kind==='letters'?<><span className="art-quote">{locale==='ar'?'الصبر مفتاح …':'Where there’s a will…'}</span><div className="art-tiles">{(locale==='ar'?['ا','ل','ف','ر','ج']:['A','W','A','Y']).map((c,i)=><span key={i} className={'art-tile'+(i===2?' art-blank':'')}>{i===2?'?':c}</span>)}</div></>:
   kind==='mcq'?<div className="art-quiz"><span className="art-quote">{locale==='ar'?'ما عاصمة السعودية؟':'Saudi Arabia’s capital?'}</span>{(locale==='ar'?['جدة','الرياض','الدمام']:['Jeddah','Riyadh','Dammam']).map((x,i)=><span className={'art-answer'+(i===1?' art-correct':'')} key={x}>{x}{i===1&&<Check size={17}/>}</span>)}</div>:
   <><div className="art-tiles">{(locale==='ar'?['ف','ك','ر']:['T','H','I','N','K']).map((x,i)=><span className="art-tile art-code" key={i}>{i===2?'?':x}<small>{[20,8,9,14,11][i]}</small></span>)}</div><span className="art-quote">{locale==='ar'?'كل رقم، حرف.':'Every number, a letter.'}</span></>}
 </div>;
}

function SamplePuzzle({locale,t}:Pick<Props,'locale'|'t'>) {
 const [selected,setSelected]=useState<string|null>(null),[round,setRound]=useState(0);
 const samples=locale==='ar'?
  [{start:'الصبر مفتاح',answer:'الفرج',options:['الفرج','الباب','الوقت']},{start:'خير الكلام ما قلّ',answer:'ودلّ',options:['وطال','ودلّ','وقيل']}]:
  [{start:'Where there’s a will, there’s a',answer:'way',options:['way','day','wish']},{start:'A journey of a thousand miles begins with a single',answer:'step',options:['map','step','dream']}];
 const sample=samples[round%samples.length],solved=selected===sample.answer;
 return <div className="sample-stage">
  <span className="float-letter float-one" aria-hidden="true">{t('W','ح')}</span>
  <section className="sample-card" aria-labelledby="sample-heading">
   <div className="sample-head"><h2 id="sample-heading">{t('Try a sample','جرّب مثالاً')}</h2></div>
   <p className="sample-proverb">{sample.start} <span className={'sample-slot'+(solved?' solved':'')}>{solved?sample.answer:'?'}</span></p>
   <p className="sample-instruction">{t('Choose the missing word.','اختر الكلمة الناقصة.')}</p>
   <div className="sample-options">{sample.options.map(option=><button className={'sample-option'+(selected===option?(solved?' correct':' incorrect'):'')} key={option} onClick={()=>{if(!solved)setSelected(option)}} aria-pressed={selected===option} aria-disabled={solved}>{option}{solved&&selected===option&&<Check size={17}/>}</button>)}</div>
   <div className="sample-foot"><p role="status" aria-live="polite" aria-atomic="true">{selected?(solved?t('That’s it! Nicely solved.','صح عليك! اكتملت الحكمة.'):t('Not quite. Try another word.','قريب! جرّب كلمة ثانية.')):''}</p><button className="sample-next" onClick={()=>{setSelected(null);setRound(r=>r+1)}}>{t('Another sample','مثال آخر')}<ArrowRight size={16}/></button></div>
  </section>
 </div>;
}

export function Home({t,locale,questionLocale,puzzleLanguage,changePuzzleLanguage,signed,active,refresh}:Props&{active:ActiveGame[]}) {
 const router=useRouter();
 const [mode,setMode]=useState<'solo'|'multi'>('solo'),[busy,setBusy]=useState(''),[error,setError]=useState('');
 async function start(kind:Kind) {
  if(busy)return;
  setBusy(kind);setError('');
  try {if(mode==='multi'){router.push('/multiplayer?kind='+kind);return}const r=await api('create',{kind,locale:questionLocale,mode});router.push('/play?id='+r.id)}
  catch(e){
   const message=(e as Error).message;
   if(isActiveGameConflict(message))await refresh();
   setError(message);
   setBusy('');
  }
 }
 return <div className="home-design">
  <section className="playful-hero" aria-labelledby="hero-heading">
   <div className="hero-copy"><h1 id="hero-heading">{t('Small puzzle.','حرف ناقص.')}<br/><em>{t('Big aha!','تحدّي كامل.')}</em></h1><p className="hero-description">{t('Complete a proverb, test your knowledge or crack a code. Play on your own or challenge your friends.','كمّل الحكمة، اختبر معلوماتك، أو فك الشفرة. العب لحالك أو تحدَّ أصحابك.')}</p><div className="hero-actions"><a className="btn" href="#choose-game" onClick={()=>setMode('solo')}>{t('Start playing','ابدأ اللعب')}<ArrowRight size={19}/></a></div><p className="hero-note">{t('Arabic & English · Play as a guest','عربي وإنجليزي · تقدر تلعب كضيف')}</p></div>
   <SamplePuzzle key={locale} locale={locale} t={t}/>
  </section>
  <section className="game-selection" id="choose-game" aria-labelledby="games-heading">
   <div className="selection-heading"><h2 id="games-heading">{t('Choose a game','اختر لعبتك')}</h2></div>
   <div className="modebar"><div className="mode-switch" role="group" aria-label={t('Play mode','طريقة اللعب')}><button aria-pressed={mode==='solo'} onClick={()=>setMode('solo')}><User size={17}/>{t('Solo play','لعب فردي')}</button><button aria-pressed={mode==='multi'} onClick={()=>setMode('multi')}><Users size={17}/>{t('With friends','مع الأصدقاء')}</button></div><div className="language-pick"><Globe size={17}/><span>{t('Puzzle language','لغة الألغاز')}</span><PuzzleLanguagePicker t={t} puzzleLanguage={puzzleLanguage} changePuzzleLanguage={changePuzzleLanguage}/></div></div>
   <p className="mode-detail muted">{mode==='multi'?t('Share a room code. Play 5 rounds, and the first correct answer wins each round.','شارك رمز الغرفة مع أصحابك. العبوا 5 جولات، وأول إجابة صحيحة تفوز بالجولة.'):t('10 puzzles at your own pace.','10 ألغاز على راحتك.')}</p>
   {error&&<div className="notice error start-error" role="alert"><StartGameError error={error} t={t} active={active}/></div>}
   <div className="games">{kinds.map((kind,i)=><article className="game-card" key={kind}>
    <GameArt kind={kind} locale={locale}/><div className="card-body"><h3>{title(kind,locale)}</h3><p>{[t('Choose and arrange the missing letters to complete a proverb.','اختر الحروف الناقصة ورتّبها عشان تكتمل الحكمة.'),t('Read the question and choose the correct answer.','اقرأ السؤال واختر الإجابة الصحيحة من الخيارات.'),t('Match numbers with letters to reveal the hidden wisdom.','اربط الأرقام بالحروف واكتشف الحكمة المخفية.')][i]}</p><div className="card-foot"><button className="play-link" disabled={!!busy} onClick={()=>start(kind)}>{busy===kind?t('Preparing…','جارٍ التحضير…'):mode==='multi'?t('Create room','أنشئ غرفة'):t('Play','العب')}<ArrowRight size={17}/></button></div></div>
   </article>)}</div>
  </section>
  <section className="home-notes" aria-labelledby="progress-heading">
   <article>
    <span className="note-icon" aria-hidden="true"><Coins size={25}/></span>
    <div>
     <h2 id="progress-heading">{t('Save your progress','احفظ تقدّمك')}</h2>
     <p>{t('Sign in to save your games and earn HR. A solo skip costs 5 HR. Points have no cash value.','سجّل دخولك عشان تحفظ ألعابك وتكسب نقاط HR. تخطّي اللغز في اللعب الفردي يكلف 5 نقاط، والنقاط ما لها قيمة نقدية.')}</p>
     <Link href={signed?'/profile':'/login?mode=signup'}>{signed?t('See my journey','شوف رحلتي'):t('Create an account','أنشئ حساباً')}<ArrowRight size={16}/></Link>
    </div>
   </article>
  </section>
 </div>;
}
