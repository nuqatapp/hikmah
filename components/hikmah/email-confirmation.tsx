'use client';
import Link from 'next/link';
import {useUiLocale} from './use-locale';
export function EmailConfirmation({token,type}:{token:string;type:string}) {
  const {locale,setLocale}=useUiLocale(),ar=locale==='ar';
  const t=(en:string,arabic:string)=>ar?arabic:en;
  const valid=!!token&&(type==='email'||type==='recovery');
  const recovery=type==='recovery';
  return <main className="shell main" lang={locale} dir={ar?'rtl':'ltr'}><section className="panel stack" style={{maxWidth:480,margin:'0 auto'}}>
    <div className="flex-row spread"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">ح</span><span className="brand-name">{t('Hikmah','حكمة')}</span></Link><button className="btn outline" onClick={()=>setLocale(ar?'en':'ar')}>{ar?'English':'العربية'}</button></div>
    <h1>{recovery?t('Choose a new password.','اختر كلمة مرور جديدة.'):t('One more step.','باقي خطوة.')}</h1>
    {valid?<><p>{recovery?t('Continue to reset the password for the account that requested this email.','تابع لإعادة تعيين كلمة مرور الحساب الذي طلب هذه الرسالة.'):t('Confirm your email to finish creating your Hikmah account. Only continue if you requested this email.','أكد بريدك لإكمال إنشاء حسابك في حكمة. تابع فقط إذا كنت أنت من طلب هذه الرسالة.')}</p><form action="/auth/confirm/verify" method="post"><input type="hidden" name="token_hash" value={token}/><input type="hidden" name="type" value={type}/><button className="btn" type="submit">{recovery?t('Continue to password reset','المتابعة لتغيير كلمة المرور'):t('Confirm my email','تأكيد بريدي الإلكتروني')}</button></form></>:<p role="alert">{t('This link is incomplete. Request a new email from the sign-in page.','هذا الرابط غير مكتمل. اطلب رسالة جديدة من صفحة الدخول.')}</p>}
    <Link className="back-link" href="/login">{t('Back to sign in','العودة إلى تسجيل الدخول')}</Link>
  </section></main>;
}
