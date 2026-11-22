'use client';
import {useEffect,useRef,useState, type FormEvent} from 'react';
import {SignupCaptcha} from './signup-captcha';
import Link from 'next/link';
import {browserAuth} from '@/lib/supabase/client';
import {safeNext} from '@/lib/supabase/config';
import {useUiLocale} from './use-locale';
import {LegalLinks} from './legal-links';
import {StorageNotice} from './storage-notice';
import {AccountConsentFields,consentFromForm} from './account-consent-fields';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';
function authMessage(code:string,fallback:string,t:(en:string,ar:string)=>string){
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return t('Email requests are temporarily limited. Try again later, or continue as a guest.','طلبات البريد محدودة مؤقتًا. حاول لاحقًا، أو تابع اللعب كضيف.');
 if(code==='email_address_not_authorized')return t('Account email is not available right now. Continue as a guest or contact support.','بريد الحساب غير متاح حاليًا. تابع كضيف أو تواصل مع الدعم.');
 if(code==='email_not_confirmed')return t('Confirm your email before signing in.','أكد بريدك الإلكتروني قبل تسجيل الدخول.');
 if(code==='callback')return t('We could not complete sign-in from this link. If you already confirmed your email, sign in below with your password. Otherwise request a new link.','تعذر إكمال الدخول من هذا الرابط. إذا أكدت بريدك بالفعل، سجل الدخول أدناه بكلمة مرورك. وإلا فاطلب رابطًا جديدًا.');
 if(code==='reset_sent')return t('If an account exists, a password reset link has been sent.','إذا كان الحساب موجودًا، فستصلك رسالة لإعادة تعيين كلمة المرور.');
 if(code==='signup_consent')return t('Accept the account terms and provide the required consent.','وافق على شروط الحساب وقدّم الموافقة المطلوبة.');
 if(code==='captcha')return t('Complete verification again.','أكمل التحقق مجددًا.');
 if(code==='signup_fields')return t('Enter a nickname, email and password of at least 12 characters.','أدخل اسمًا مستعارًا وبريدًا إلكترونيًا وكلمة مرور من ١٢ حرفًا على الأقل.');
 if(code==='network')return t('Could not connect to sign-in. Check your connection and try again.','تعذر الاتصال بخدمة الدخول. تحقق من اتصالك وحاول مرة أخرى.');
 return fallback;
}
export function AuthForm({configured, google, next, reset = false, callbackError = false, initialMode = 'signin'}: {
  configured: boolean; google: boolean; next: string; reset?: boolean; callbackError?: boolean; initialMode?: 'signin' | 'signup';
}) {
  const {locale,setLocale}=useUiLocale();
  const arabic=locale==='ar';
  const [mode, setMode] = useState<Mode>(reset ? 'reset' : initialMode);
  const [busy, setBusy] = useState(false);
  const [signupEmail,setSignupEmail]=useState('');
  const [captchaAttempt,setCaptchaAttempt]=useState(0);
  const [resendUntil,setResendUntil]=useState(0);
  const [resendStatus,setResendStatus]=useState<'sent'|'failed'|null>(null);
  useEffect(()=>{
    if(!resendUntil)return;
    const timeout=setTimeout(()=>setResendUntil(0),Math.max(0,resendUntil-Date.now()));
    return ()=>clearTimeout(timeout);
  },[resendUntil]);
  async function resend(){
    if(busy||resendUntil)return;
    setBusy(true);setResendStatus(null);
    try{
      const callback=new URL('/auth/callback',location.origin);
      callback.searchParams.set('next',safeNext(next));
      const {error}=await browserAuth().auth.resend({type:'signup',email:signupEmail,options:{emailRedirectTo:callback.toString()}});
      if(error)throw error;
      setResendStatus('sent');
    }catch{setResendStatus('failed')}
    finally{setResendUntil(Date.now()+60_000);setBusy(false)}
  }
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(signupEmail)heading.current?.focus()},[signupEmail]);
  const [message, setMessage] = useState(callbackError ? 'We could not complete sign-in from this link. If you already confirmed your email, sign in below with your password. Otherwise request a new link.' : '');
  const [failed, setFailed] = useState(callbackError);
  const [messageCode,setMessageCode]=useState(callbackError?'callback':'');
  const t = (en: string, ar: string) => arabic ? ar : en;
  function change(value: Mode) { setMode(value); setSignupEmail(''); setMessage(''); setMessageCode(''); setFailed(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setMessageCode(''); setFailed(false);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    try {
      if(mode==='signup'){
        const response=await fetch('/auth/signup',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email,password,altcha:form.get('altcha'),name:String(form.get('name')||''),next,consent:consentFromForm(form)}),
        });
        const result=await response.json();
        if(!response.ok)throw Object.assign(new Error(result.error),{code:result.code});
        if(result.signedIn){window.location.assign(safeNext(next));return}
        setSignupEmail(email);setResendStatus(null);setResendUntil(Date.now()+60_000);
        return;
      }
      const client = browserAuth();
      const callback = window.location.origin + '/auth/callback';
      if (mode === 'signin') {
        const {error} = await client.auth.signInWithPassword({email, password});
        if (error) throw new Error(t('Sign-in failed. Check your email, password and email confirmation.', 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور وتأكيد البريد.'));
        window.location.assign(safeNext(next)); return;
      }
      if (mode === 'forgot') {
        const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo: callback + '?next=/reset-password'});
        if (error) throw error;
        setMessage(t('If an account exists, a password reset link has been sent.', 'إذا كان الحساب موجودًا، فستصلك رسالة لإعادة تعيين كلمة المرور.'));
        setMessageCode('reset_sent');
      } else {
        if (password !== form.get('confirm')) throw new Error(t('Passwords do not match.', 'كلمتا المرور غير متطابقتين.'));
        const {error} = await client.auth.updateUser({password});
        if (error) throw error;
        window.location.assign('/'); return;
      }
    } catch (error) {
      setFailed(true);
      const code=(error as {code?:unknown})?.code;
      setMessageCode(typeof code==='string'?code:error instanceof TypeError?'network':'');
      setMessage(error instanceof Error ? error.message : t('Please try again.', 'حاول مرة أخرى.'));
    } finally { if(mode==='signup')setCaptchaAttempt(n=>n+1);setBusy(false); }
  }
  async function withGoogle() {
    setBusy(true); setMessage(''); setMessageCode(''); setFailed(false);
    try {
      const {error} = await browserAuth().auth.signInWithOAuth({provider: 'google', options: {
        redirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(safeNext(next)),
        queryParams: {prompt: 'select_account'},
      }});
      if (error) throw error;
    } catch { setFailed(true); setMessage(t('Google sign-in is unavailable. Try email sign-in.', 'تسجيل الدخول بجوجل غير متاح. استخدم البريد الإلكتروني.')); setBusy(false); }
  }
  const titles = {signin: t('Welcome back.', 'مرحبًا بعودتك.'), signup: t('Join Hikmah.', 'انضم إلى حكمة.'), forgot: t('Reset your password.', 'أعد تعيين كلمة المرور.'), reset: t('Choose a new password.', 'اختر كلمة مرور جديدة.')};
  return <main className="shell main" lang={locale} dir={arabic ? 'rtl' : 'ltr'}><section className="panel stack" style={{maxWidth:480, margin:'0 auto'}}>
    <div className="flex-row spread"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">ح</span><span className="brand-name">{t('Hikmah','حكمة')}</span></Link><button type="button" className="btn outline" onClick={() => setLocale(arabic?'en':'ar')}>{arabic ? 'English' : 'العربية'}</button></div>
    {signupEmail ? <>
      <h1 ref={heading} tabIndex={-1} style={{fontSize:'2.3rem'}}>{t('Check your email','تحقق من بريدك الإلكتروني')}</h1>
      <p>{t('Registration submitted. Confirm your email to activate your account.','تم إرسال طلب التسجيل. أكّد بريدك الإلكتروني لتفعيل حسابك.')}</p>
      <p>{t('Open the Hikmah email sent to','افتح رسالة حكمة المرسلة إلى')} <bdi>{signupEmail}</bdi> {t('and select “Confirm email.”','واضغط «تأكيد البريد».')}</p>
      <p className="muted">{t('Check your spam folder if the email doesn’t arrive. If you already have an account, sign in below.','إذا لم تصلك الرسالة، فتحقق من البريد غير المرغوب فيه. إذا كان لديك حساب، فسجّل الدخول أدناه.')}</p>
      <button type="button" className="btn outline" onClick={()=>change('signin')}>{t('Back to sign in','العودة إلى تسجيل الدخول')}</button>
      <button type="button" className="btn outline" disabled={busy||!!resendUntil} onClick={resend}>{t('Resend confirmation email','إعادة إرسال رسالة التأكيد')}</button>
      {resendStatus&&<p role={resendStatus==='failed'?'alert':'status'}>{resendStatus==='sent'?t('If confirmation is still pending, check your inbox for a new link.','إذا كان التأكيد لا يزال معلقًا، تحقق من بريدك لرابط جديد.'):t('Could not resend the email. Try again in a minute.','تعذّر إعادة الإرسال. حاول مجددًا بعد دقيقة.')}</p>}
      <button type="button" className="back-link" onClick={()=>change('signup')}>{t('Use a different email','استخدم بريدًا إلكترونيًا آخر')}</button>
    </> : <>
    <h1 style={{fontSize:'2.3rem'}}>{titles[mode]}</h1>
    <p className="muted">{t('Save your progress and play with friends.', 'احفظ تقدمك والعب مع أصدقائك.')}</p>
    {!configured ? <p role="status">{t('Sign-in is being configured. Solo play is available as a guest.', 'جارٍ إعداد تسجيل الدخول. يمكنك اللعب الفردي كضيف.')}</p> : <>
      {google && (mode === 'signin' || mode === 'signup') && <button type="button" className="btn outline" disabled={busy} onClick={withGoogle}>{t('Continue with Google', 'المتابعة باستخدام جوجل')}</button>}
      <form onSubmit={submit} className="stack">
        <p className="muted">{t('We use this information to operate your account. ','نستخدم هذه المعلومات لتشغيل حسابك. ')}<Link href="/privacy" target="_blank">{t('Privacy details','تفاصيل الخصوصية')}</Link></p>
        {mode === 'signup' && <p>{t('All ages can play. If the player cannot legally consent, their legal guardian must create and manage the account using the guardian’s email. Choose a nickname, not a child’s real name.','يمكن لجميع الأعمار اللعب. إذا لم يملك اللاعب أهلية الموافقة، فعلى وليه النظامي إنشاء الحساب وإدارته ببريد الولي. اختر اسمًا مستعارًا وليس اسم الطفل الحقيقي.')}</p>}
        {mode === 'signup' && <label className="field">{t('Nickname', 'الاسم المستعار')}<input name="name" autoComplete="nickname" required minLength={2} maxLength={40}/></label>}
        {mode !== 'reset' && <label className="field">{t('Email', 'البريد الإلكتروني')}<input name="email" type="email" dir="ltr" autoComplete="email" required maxLength={254}/></label>}
        {mode !== 'forgot' && <label className="field">{t('Password', 'كلمة المرور')}<input name="password" type="password" dir="ltr" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={mode === 'signin' ? 1 : 12} maxLength={128}/>{mode !== 'signin' && <span className="muted">{t('At least 12 characters.', '١٢ حرفًا على الأقل.')}</span>}</label>}
        {mode === 'reset' && <label className="field">{t('Confirm password', 'تأكيد كلمة المرور')}<input name="confirm" type="password" autoComplete="new-password" dir="ltr" required minLength={12} maxLength={128}/></label>}
        {mode==='signup'&&<><AccountConsentFields t={t}/><SignupCaptcha key={captchaAttempt} arabic={arabic}/></>}
        {message && <p role={failed ? 'alert' : 'status'} className={'notice' + (failed ? ' error' : '')}>{authMessage(messageCode,message,t)}</p>}
        <button className="btn" disabled={busy}>{busy ? t('Please wait...', 'يرجى الانتظار...') : mode === 'signup' ? t('Create account', 'إنشاء حساب') : mode === 'forgot' ? t('Send reset link', 'إرسال رابط الاستعادة') : mode === 'reset' ? t('Save password', 'حفظ كلمة المرور') : t('Sign in', 'تسجيل الدخول')}</button>
      </form>
      {mode === 'signin' && <><button type="button" className="back-link" disabled={busy} onClick={() => change('forgot')}>{t('Forgot password?', 'نسيت كلمة المرور؟')}</button><button type="button" className="back-link" disabled={busy} onClick={() => change('signup')}>{t('Create an account', 'إنشاء حساب جديد')}</button></>}
      {(mode === 'signup' || mode === 'forgot') && <button type="button" className="back-link" disabled={busy} onClick={() => change('signin')}>{t('Back to sign in', 'العودة إلى تسجيل الدخول')}</button>}
    </>}
    </>}
    <Link href="/" className="back-link">{t('Continue as a guest', 'المتابعة كضيف')}</Link>
    <LegalLinks arabic={arabic}/>
  </section><StorageNotice arabic={arabic}/></main>;
}
