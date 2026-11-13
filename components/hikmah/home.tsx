'use client';
import {type Kind,type Locale} from '@/lib/game/rules';
import {ArrowRight,Check,Coins,Globe,User,Users} from 'lucide-react';
import {useState} from 'react';
import {gameErrorText,api,kinds,Picker,title,type Props} from './shared';

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
  <span className="float-letter float-one" aria-hidden="true">{t('W','ح')}</span><span className="float-letter float-two" aria-hidden="true">{t('A','ك')}</span><span className="float-letter float-three" aria-hidden="true">?</span>
  <section className="sample-card" aria-labelledby="sample-heading">
   <div className="sample-head"><h2 id="sample-heading">{t('Try a sample','جرّب مثالاً')}</h2><span className="sample-badge">{t('Sample · No points','مثال · بدون نقاط')}</span></div>
   <p className="sample-proverb">{sample.start} <span className={'sample-slot'+(solved?' solved':'')}>{solved?sample.answer:'?'}</span></p>
   <p className="sample-instruction">{t('Choose the missing word.','اختر الكلمة الناقصة.')}</p>
   <div className="sample-options">{sample.options.map(option=><button className={'sample-option'+(selected===option?(solved?' correct':' incorrect'):'')} key={option} onClick={()=>{if(!solved)setSelected(option)}} aria-pressed={selected===option} aria-disabled={solved}>{option}{solved&&selected===option&&<Check size={17}/>}</button>)}</div>
   <div className="sample-foot"><p role="status" aria-live="polite" aria-atomic="true">{selected?(solved?t('That’s it! Nicely solved.','صح عليك! اكتملت الحكمة.'):t('Not quite. Try another word.','قريب! جرّب كلمة ثانية.')):t('A little thought goes a long way.','خذ راحتك وفكّر فيها.')}</p><button className="sample-next" onClick={()=>{setSelected(null);setRound(r=>r+1)}}>{t('Another sample','مثال آخر')}<ArrowRight size={16}/></button></div>
  </section>
 </div>;
}

export function Home({t,locale,questionLocale,setQuestionLocale,signed,active}:Props&{active:any[];counts:any[]}) {
 const [mode,setMode]=useState<'solo'|'multi'>('solo'),[busy,setBusy]=useState(''),[error,setError]=useState('');
 async function start(kind:Kind) {
  if(busy)return;
  setBusy(kind);setError('');
  try {if(mode==='multi'){window.location.href='/multiplayer?kind='+kind;return}const r=await api('create',{kind,locale:questionLocale,mode});window.location.href='/play?id='+r.id}
  catch(e){setError((e as Error).message);setBusy('')}
 }
 return <div className="home-design">
  <section className="playful-hero" aria-labelledby="hero-heading">
   <div className="hero-copy"><p className="eyebrow"><span className="label-dot"/>{t('A little wisdom. A lot of play.','حكمة خفيفة. وتحدّي على كيفك.')}</p><h1 id="hero-heading">{t('Small puzzle.','حرف ناقص.')}<br/><em>{t('Big aha!','تحدّي كامل.')}</em></h1><p className="hero-description">{t('Complete a proverb, test your knowledge or crack a code. Play on your own or challenge your friends.','كمّل الحكمة، اختبر معلوماتك، أو فك الشفرة. العب لحالك أو تحدَّ أصحابك.')}</p><div className="hero-actions"><a className="btn" href="#choose-game" onClick={()=>setMode('solo')}>{t('Start playing','ابدأ اللعب')}<ArrowRight size={19}/></a><a className="btn outline" href="/multiplayer"><Users size={18}/>{t('Play with friends','العب مع الأصدقاء')}</a></div><p className="hero-note">{t('Arabic & English · Play as a guest','عربي وإنجليزي · تقدر تلعب كضيف')}</p></div>
   <SamplePuzzle key={locale} locale={locale} t={t}/>
  </section>
  <section className="game-selection" id="choose-game" aria-labelledby="games-heading">
   <div className="selection-heading"><div><p className="eyebrow">{t('Pick your challenge','وش تحدّيك اليوم؟')}</p><h2 id="games-heading">{t('Three games.','ثلاث ألعاب.')}{' '}<em>{t('Your move.','والاختيار لك.')}</em></h2><p className="muted">{t('Choose a game and puzzle language.','اختر لعبتك ولغة الألغاز.')}</p></div><span className="selection-doodle" aria-hidden="true">{t('GO!','يلا!')}</span></div>
   <div className="modebar"><div className="mode-switch" role="group" aria-label={t('Play mode','طريقة اللعب')}><button aria-pressed={mode==='solo'} onClick={()=>setMode('solo')}><User size={17}/>{t('Solo play','لعب فردي')}</button><button aria-pressed={mode==='multi'} onClick={()=>setMode('multi')}><Users size={17}/>{t('With friends','مع الأصدقاء')}</button></div><div className="language-pick"><Globe size={17}/><span>{t('Puzzle language','لغة الألغاز')}</span><Picker value={questionLocale} onChange={v=>setQuestionLocale(v as Locale)} label={t('Puzzle language','لغة الألغاز')} items={[["en","English"],["ar","العربية"]]}/></div></div>
   {error&&<div className="notice error start-error" role="alert">{gameErrorText(error,t)}</div>}
   {active.length>0&&<div className="notice unfinished"><strong>{t('Pick up where you left off','كمّل من وين وقفت')}</strong><div className="flex-row">{active.map(a=><a key={a.id} href={'/play?id='+a.id}>{title(a.kind,locale)} · {a.mode==='multi'?t('Friends','الأصدقاء'):t('Solo','فردي')}<ArrowRight size={16}/></a>)}</div></div>}
   <div className="games">{kinds.map((kind,i)=><article className="game-card" key={kind}>
    <GameArt kind={kind} locale={locale}/><div className="card-body"><span className="eyebrow">{['01 / '+t('Complete the proverb','كمّل الحكمة'),'02 / '+t('Test your knowledge','اختبر معلوماتك'),'03 / '+t('Crack the code','فك الشفرة')][i]}</span><h3>{title(kind,locale)}</h3><p>{[t('Choose and arrange the missing letters to complete a proverb.','اختر الحروف الناقصة ورتّبها عشان تكتمل الحكمة.'),t('Read the question and choose the correct answer.','اقرأ السؤال واختر الإجابة الصحيحة من الخيارات.'),t('Match numbers with letters to reveal the hidden wisdom.','اربط الأرقام بالحروف واكتشف الحكمة المخفية.')][i]}</p><div className="card-foot"><span>{mode==='multi'?t('5 rounds · First to solve','5 جولات · الأسرع بالحل'):t('10 puzzles · At your pace','10 ألغاز · على راحتك')}</span><button className="play-link" disabled={!!busy} onClick={()=>start(kind)}>{busy===kind?t('Preparing…','جارٍ التحضير…'):mode==='multi'?t('Create room','أنشئ غرفة'):t('Play','العب')}<ArrowRight size={17}/></button></div></div>
   </article>)}</div>
  </section>
  <section className="friends-section" aria-labelledby="friends-heading"><div><p className="eyebrow">{t('A challenge worth sharing','التحدّي يحلو مع الرفقة')}</p><h2 id="friends-heading">{t('Same puzzle.','نفس اللغز.')}<br/><em>{t('Who gets there first?','مين يحلّه أول؟')}</em></h2><p>{t('Create a room and share the code. Play five rounds together: the first correct answer wins each round.','أنشئ غرفة وشارك رمزها مع أصحابك. العبوا خمس جولات، وأول إجابة صحيحة تفوز بالجولة.')}</p><a className="btn" href="/multiplayer"><Users size={18}/>{t('Play with friends','العب مع الأصدقاء')}</a></div><div className="friends-illustration" aria-hidden="true"><div className="room-ticket"><span>{t('YOUR ROOM','غرفتكم')}</span><strong dir="ltr">H K M A</strong><span>{t('Share a code. Share a challenge.','رمز واحد. وتحدّي يجمعكم.')}</span></div><div className="round-illustration">{Array.from({length:5},(_,i)=><span key={i}>{i<3?<Check size={21}/>:i+1}</span>)}</div><span className="illustration-caption">{t('5 rounds · Every answer counts','5 جولات · كل إجابة تفرق')}</span></div></section>
  <section className="home-notes" aria-label={t('Progress and points','التقدّم والنقاط')}><article><span className="note-icon"><Coins size={25}/></span><div><h2>{t('Solve it. Earn it.','حلّها واكسب نقاطها.')}</h2><p>{t('Sign in to earn HR points as you solve. Use 5 HR to skip a solo puzzle. HR has no cash value.','سجّل دخولك لتكسب نقاط HR مع الحل. استخدم 5 HR لتخطي لغز فردي. النقاط ليست لها قيمة نقدية.')}</p></div></article><article><span className="note-icon"><User size={25}/></span><div><h2>{t('A journey that’s yours.','رحلتك، على كيفك.')}</h2><p>{t('Play as a guest, or use an account to save your progress and HR points.','العب كضيف، أو استخدم حساباً لحفظ تقدّمك ونقاط HR.')}</p><a href={signed?'/profile':'/login?mode=signup'}>{signed?t('See my journey','شوف رحلتي'):t('Create an account','أنشئ حساباً')}<ArrowRight size={16}/></a></div></article></section>
  <section className="final-challenge"><span className="final-letter" aria-hidden="true">?</span><h2>{t('Your next aha awaits.','جاهز للحكمة الجاية؟')}</h2><p>{t('Pick a puzzle. Take your time. Enjoy the discovery.','اختر لغزك، خذ راحتك، واستمتع بالحل.')}</p><a className="btn" href="#choose-game">{t('Start playing','ابدأ اللعب')}<ArrowRight size={19}/></a></section>
 </div>;
}
