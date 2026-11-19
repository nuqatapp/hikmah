'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {AccountConsentFields,consentFromForm} from './account-consent-fields';
import {gameErrorText,api,type Props} from './shared';

export function AccountOnboarding({t,onAccepted}:{t:Props['t'];onAccepted:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');
  try{await api('consent',consentFromForm(new FormData(event.currentTarget)));await onAccepted()}
  catch(e){setError((e as Error).message)}
  finally{setBusy(false)}
 }
 return <section className="panel stack play-wrap"><h1>{t('A little care before we play.','خطوة اطمئنان قبل اللعب.')}</h1>
  <p>{t('The game welcomes all ages. The account must be managed by someone who can legally consent, or by the player’s legal guardian. We do not need an exact date of birth.','اللعبة ترحب بجميع الأعمار. يدير الحساب من يملك أهلية الموافقة أو الولي النظامي للاعب. لا نحتاج إلى تاريخ ميلاد دقيق.')}</p>
  <form className="stack" onSubmit={submit}>
   <AccountConsentFields t={t}/>
   <p className="muted">{t('Guardians can review, export or erase the account data in Settings, or contact support.','يمكن للأولياء مراجعة بيانات الحساب أو تنزيلها أو محوها من الإعدادات أو عبر الدعم.')}</p>
   {error&&<p role="alert" className="notice error">{gameErrorText(error,t)}</p>}
   <button className="btn" disabled={busy}>{busy?t('Saving…','جارٍ الحفظ…'):t('Save and continue','حفظ ومتابعة')}</button>
  </form>
  <Link className="back-link" href="/settings">{t('Account and data controls','أدوات الحساب والبيانات')}</Link>
  <form action="/auth/signout" method="post"><button className="back-link">{t('Sign out and play as a guest','الخروج واللعب كضيف')}</button></form>
 </section>;
}
