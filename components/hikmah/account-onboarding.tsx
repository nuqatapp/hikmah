'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {ACCOUNT_POLICY_VERSION,type AccountCapacity} from '@/lib/policy';
import {gameErrorText,api,type Props} from './shared';

export function AccountOnboarding({t,onAccepted}:{t:Props['t'];onAccepted:()=>Promise<void>}){
 const [capacity,setCapacity]=useState<AccountCapacity>('self'),[relationship,setRelationship]=useState('parent'),[accepted,setAccepted]=useState(false),[legalCapacity,setLegalCapacity]=useState(false),[childDataConsent,setChildDataConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{await api('consent',{version:ACCOUNT_POLICY_VERSION,capacity,relationship,accepted,legalCapacity,childDataConsent});await onAccepted()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="panel stack play-wrap"><h1>{t('A little care before we play.','خطوة اطمئنان قبل اللعب.')}</h1>
  <p>{t('The game welcomes all ages. The account must be managed by someone who can legally consent, or by the player’s legal guardian. We do not need an exact date of birth.','اللعبة ترحب بجميع الأعمار. يدير الحساب من يملك أهلية الموافقة أو الولي النظامي للاعب. لا نحتاج إلى تاريخ ميلاد دقيق.')}</p>
  <form className="stack" onSubmit={submit}>
   <fieldset className="stack"><legend>{t('Who manages this account?','من يدير هذا الحساب؟')}</legend>
    <label className="check-field"><input type="radio" name="capacity" checked={capacity==='self'} onChange={()=>setCapacity('self')}/>{t('I manage my own account and have legal capacity to consent.','أدير حسابي وأملك أهلية الموافقة.')}</label>
    <label className="check-field"><input type="radio" name="capacity" checked={capacity==='guardian'} onChange={()=>setCapacity('guardian')}/>{t('I am a legal guardian managing this account for a player.','أنا الولي النظامي وأدير هذا الحساب للاعب.')}</label>
   </fieldset>
   {capacity==='guardian'&&<><label className="field">{t('Your authority','صفتك')}<select value={relationship} onChange={e=>setRelationship(e.target.value)}><option value="parent">{t('Parent with legal guardianship','أحد الوالدين وله الولاية النظامية')}</option><option value="legal_guardian">{t('Other legally appointed guardian','ولي أو وصي معين نظامًا')}</option></select></label>
    <p>{t('Use your verified adult/guardian email, not the child’s email. Use a nickname and avoid identifying information. Contact support if the wrong email was used. We may request proportionate verification of guardianship where necessary.','استخدم بريدك المؤكد بصفتك بالغًا أو وليًا، وليس بريد الطفل. استخدم اسمًا مستعارًا وتجنب معلومات التعريف. تواصل مع الدعم عند استخدام بريد غير مناسب. قد نطلب تحققًا متناسبًا من الولاية عند اللزوم.')}</p>
    <label className="check-field"><input type="checkbox" checked={childDataConsent} onChange={e=>setChildDataConsent(e.target.checked)} required/>{t('I confirm my legal guardianship and authorise the player’s nickname, progress and public game results as described in the privacy notice.','أؤكد ولايتي النظامية وأوافق على معالجة اسم اللاعب المستعار وتقدمه ونتائج لعبه الظاهرة وفق إشعار الخصوصية.')}</label></>}
   <label className="check-field"><input type="checkbox" checked={legalCapacity} onChange={e=>setLegalCapacity(e.target.checked)} required/>{t('I have legal capacity to accept these terms. The verified account email belongs to me as account holder or legal guardian.','أملك أهلية قبول هذه الشروط، وبريد الحساب المؤكد يخصني بصفتي صاحب الحساب أو الولي النظامي.')}</label>
   <label className="check-field"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>{t('I accept the ','أوافق على ')}<Link href="/terms" target="_blank">{t('terms','الشروط')}</Link>{t(' and have read the ',' واطلعت على ')}<Link href="/privacy" target="_blank">{t('privacy notice','إشعار الخصوصية')}</Link>.</span></label>
   <p className="muted">{t('No marketing consent is requested. Guardians can review, export or erase the account data in Settings, or contact support.','لا نطلب موافقة تسويقية. يمكن للأولياء مراجعة بيانات الحساب أو تنزيلها أو محوها من الإعدادات أو عبر الدعم.')}</p>
   {error&&<p role="alert" className="notice error">{gameErrorText(error,t)}</p>}
   <button className="btn" disabled={busy||!accepted||!legalCapacity||(capacity==='guardian'&&!childDataConsent)}>{busy?t('Saving…','جارٍ الحفظ…'):t('Save and continue','حفظ ومتابعة')}</button>
  </form>
  <Link className="back-link" href="/settings">{t('Account and data controls','أدوات الحساب والبيانات')}</Link>
  <form action="/auth/signout" method="post"><button className="back-link">{t('Sign out and play as a guest','الخروج واللعب كضيف')}</button></form>
 </section>;
}
