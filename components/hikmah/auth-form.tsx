'use client';
import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {browserAuth} from '@/lib/supabase/client';
import {safeNext} from '@/lib/supabase/config';
import {useUiLocale} from './use-locale';
import {LegalLinks} from './legal-links';
import {StorageNotice} from './storage-notice';
import {ACCOUNT_POLICY_VERSION} from '@/lib/policy';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';
function authMessage(code:string,fallback:string,t:(en:string,ar:string)=>string){
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return t('Email requests are temporarily limited. Try again later, or continue as a guest.','طلبات البريد محدودة مؤقتًا. حاول لاحقًا، أو تابع اللعب كضيف.');
 if(code==='email_address_not_authorized')return t('Account email is not available right now. Continue as a guest or contact support.','بريد الحساب غير متاح حاليًا. تابع كضيف أو تواصل مع الدعم.');
 if(code==='email_not_confirmed')return t('Confirm your email before signing in.','أكد بريدك الإلكتروني قبل تسجيل الدخول.');
 if(code==='callback')return t('This sign-in link expired or could not be verified. Request a new link and open it in the same browser.','انتهت صلاحية رابط الدخول أو تعذر التحقق منه. اطلب رابطًا جديدًا وافتحه في المتصفح نفسه.');
 if(code==='confirm_sent')return t('Check your inbox to confirm your email. Open the link in this browser. If you already have an account, sign in or reset your password.','تحقق من بريدك لتأكيد الحساب وافتح الرابط في هذا المتصفح. إذا كان لديك حساب، سجل الدخول أو أعد تعيين كلمة المرور.');
 if(code==='reset_sent')return t('If an account exists, a password reset link has been sent. Open it in this browser.','إذا كان الحساب موجودًا، فستصلك رسالة لإعادة تعيين كلمة المرور. افتح الرابط في هذا المتصفح.');
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
  const [termsAccepted,setTermsAccepted]=useState(false),[legalCapacity,setLegalCapacity]=useState(false);
  const [message, setMessage] = useState(callbackError ? 'This sign-in link expired or could not be verified. Request a new link and open it in the same browser.' : '');
  const [failed, setFailed] = useState(callbackError);
  const [messageCode,setMessageCode]=useState(callbackError?'callback':'');
  const t = (en: string, ar: string) => arabic ? ar : en;
  function change(value: Mode) { setMode(value); setMessage(''); setMessageCode(''); setFailed(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setMessageCode(''); setFailed(false);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    try {
      const client = browserAuth();
      const callback = window.location.origin + '/auth/callback';
      if (mode === 'signin') {
        const {error} = await client.auth.signInWithPassword({email, password});
        if (error) throw new Error(t('Sign-in failed. Check your email, password and email confirmation.', 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور وتأكيد البريد.'));
        window.location.assign(safeNext(next)); return;
      }
      if (mode === 'signup') {
        if(!termsAccepted||!legalCapacity)throw new Error(t('Accept the terms and confirm legal capacity before creating an account.','وافق على الشروط وأكد أهلية الموافقة قبل إنشاء الحساب.'));
        const {data, error} = await client.auth.signUp({email, password, options: {
          data: {full_name: String(form.get('name') || 'Player').trim().slice(0,40),initial_terms_version:ACCOUNT_POLICY_VERSION},
          emailRedirectTo: callback + '?next=' + encodeURIComponent(safeNext(next)),
        }});
        if (error) throw error;
        if (data.session) { window.location.assign(safeNext(next)); return; }
        setMessage(t('Check your inbox to confirm your email. Open the link in this browser. If you already have an account, sign in or reset your password.', 'تحقق من بريدك لتأكيد الحساب وافتح الرابط في هذا المتصفح. إذا كان لديك حساب، سجل الدخول أو أعد تعيين كلمة المرور.'));
        setMessageCode('confirm_sent');
      } else if (mode === 'forgot') {
        const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo: callback + '?next=/reset-password'});
        if (error) throw error;
        setMessage(t('If an account exists, a password reset link has been sent. Open it in this browser.', 'إذا كان الحساب موجودًا، فستصلك رسالة لإعادة تعيين كلمة المرور. افتح الرابط في هذا المتصفح.'));
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
    } finally { setBusy(false); }
  }
  async function withGoogle() {
    if(mode==='signup'&&(!termsAccepted||!legalCapacity)){setFailed(true);setMessageCode('');setMessage(t('Accept the terms and confirm legal capacity below before continuing.','وافق على الشروط وأكد أهلية الموافقة أدناه قبل المتابعة.'));return;}
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
        {mode==='signup'&&<label className="check-field"><input type="checkbox" required checked={legalCapacity} onChange={e=>setLegalCapacity(e.target.checked)}/><span>{t('I have legal capacity to create this account, for myself or as the player’s legal guardian. This is my email address.','أملك أهلية إنشاء الحساب لنفسي أو بصفتي الولي النظامي للاعب، وهذا بريدي الإلكتروني.')}</span></label>}
        {mode==='signup'&&<label className="check-field"><input type="checkbox" required checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)}/><span>{t('I accept the ','أوافق على ')}<Link href="/terms" target="_blank">{t('terms','الشروط')}</Link>{t(' and have read the privacy notice.',' واطلعت على إشعار الخصوصية.')}</span></label>}
        {message && <p role={failed ? 'alert' : 'status'} className={'notice' + (failed ? ' error' : '')}>{authMessage(messageCode,message,t)}</p>}
        <button className="btn" disabled={busy}>{busy ? t('Please wait...', 'يرجى الانتظار...') : mode === 'signup' ? t('Create account', 'إنشاء حساب') : mode === 'forgot' ? t('Send reset link', 'إرسال رابط الاستعادة') : mode === 'reset' ? t('Save password', 'حفظ كلمة المرور') : t('Sign in', 'تسجيل الدخول')}</button>
      </form>
      {mode === 'signin' && <><button type="button" className="back-link" disabled={busy} onClick={() => change('forgot')}>{t('Forgot password?', 'نسيت كلمة المرور؟')}</button><button type="button" className="back-link" disabled={busy} onClick={() => change('signup')}>{t('Create an account', 'إنشاء حساب جديد')}</button></>}
      {(mode === 'signup' || mode === 'forgot') && <button type="button" className="back-link" disabled={busy} onClick={() => change('signin')}>{t('Back to sign in', 'العودة إلى تسجيل الدخول')}</button>}
    </>}
    <Link href="/" className="back-link">{t('Continue as a guest', 'المتابعة كضيف')}</Link>
    <LegalLinks arabic={arabic}/>
  </section><StorageNotice arabic={arabic}/></main>;
}
