'use client';
import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {browserAuth} from '@/lib/supabase/client';
import {safeNext} from '@/lib/supabase/config';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';
export function AuthForm({configured, google, next, reset = false, callbackError = false}: {
  configured: boolean; google: boolean; next: string; reset?: boolean; callbackError?: boolean;
}) {
  const [arabic, setArabic] = useState(false);
  const [mode, setMode] = useState<Mode>(reset ? 'reset' : 'signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(callbackError ? 'This sign-in link expired or could not be verified. Request a new link and open it in the same browser.' : '');
  const [failed, setFailed] = useState(callbackError);
  const t = (en: string, ar: string) => arabic ? ar : en;
  function change(value: Mode) { setMode(value); setMessage(''); setFailed(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setFailed(false);
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
        const {data, error} = await client.auth.signUp({email, password, options: {
          data: {full_name: String(form.get('name') || 'Player').trim().slice(0,40)},
          emailRedirectTo: callback + '?next=' + encodeURIComponent(safeNext(next)),
        }});
        if (error) throw error;
        if (data.session) { window.location.assign(safeNext(next)); return; }
        setMessage(t('Check your inbox to confirm your email. Open the link in this browser. If you already have an account, sign in or reset your password.', 'تحقق من بريدك لتأكيد الحساب وافتح الرابط في هذا المتصفح. إذا كان لديك حساب، سجل الدخول أو أعد تعيين كلمة المرور.'));
      } else if (mode === 'forgot') {
        const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo: callback + '?next=/reset-password'});
        if (error) throw error;
        setMessage(t('If an account exists, a password reset link has been sent. Open it in this browser.', 'إذا كان الحساب موجودًا، فستصلك رسالة لإعادة تعيين كلمة المرور. افتح الرابط في هذا المتصفح.'));
      } else {
        if (password !== form.get('confirm')) throw new Error(t('Passwords do not match.', 'كلمتا المرور غير متطابقتين.'));
        const {error} = await client.auth.updateUser({password});
        if (error) throw error;
        window.location.assign('/'); return;
      }
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : t('Please try again.', 'حاول مرة أخرى.'));
    } finally { setBusy(false); }
  }
  async function withGoogle() {
    setBusy(true); setMessage(''); setFailed(false);
    try {
      const {error} = await browserAuth().auth.signInWithOAuth({provider: 'google', options: {
        redirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(safeNext(next)),
        queryParams: {prompt: 'select_account'},
      }});
      if (error) throw error;
    } catch { setFailed(true); setMessage(t('Google sign-in is unavailable. Try email sign-in.', 'تسجيل الدخول بجوجل غير متاح. استخدم البريد الإلكتروني.')); setBusy(false); }
  }
  const titles = {signin: t('Welcome back.', 'مرحبًا بعودتك.'), signup: t('Join Hikmah.', 'انضم إلى حكمة.'), forgot: t('Reset your password.', 'أعد تعيين كلمة المرور.'), reset: t('Choose a new password.', 'اختر كلمة مرور جديدة.')};
  return <main className="shell main" dir={arabic ? 'rtl' : 'ltr'}><section className="panel stack" style={{maxWidth:480, margin:'0 auto'}}>
    <div className="flex-row spread"><Link href="/" className="brand"><img src="/logo.png" alt="Hikmah" width={45} height={45}/><span className="brand-name">Hikmah</span></Link><button type="button" className="back-link" onClick={() => setArabic(!arabic)}>{arabic ? 'English' : 'العربية'}</button></div>
    <h1 style={{fontSize:'2.3rem'}}>{titles[mode]}</h1>
    <p className="muted">{t('Save your progress and play with friends.', 'احفظ تقدمك والعب مع أصدقائك.')}</p>
    {!configured ? <p role="status">{t('Sign-in is being configured. Solo play is available as a guest.', 'جارٍ إعداد تسجيل الدخول. يمكنك اللعب الفردي كضيف.')}</p> : <>
      {(mode === 'signin' || mode === 'signup') && <><button type="button" className="btn outline" disabled={busy || !google} onClick={withGoogle}>{t('Continue with Google', 'المتابعة باستخدام جوجل')}</button>{!google && <p className="muted" style={{fontSize:13}}>{t('Google sign-in is not available yet.', 'تسجيل الدخول بجوجل غير متاح حاليًا.')}</p>}</>}
      <form onSubmit={submit} className="stack">
        {mode === 'signup' && <label className="field">{t('Display name', 'الاسم')}<input name="name" autoComplete="name" required minLength={2} maxLength={40}/></label>}
        {mode !== 'reset' && <label className="field">{t('Email', 'البريد الإلكتروني')}<input name="email" type="email" dir="ltr" autoComplete="email" required maxLength={254}/></label>}
        {mode !== 'forgot' && <label className="field">{t('Password', 'كلمة المرور')}<input name="password" type="password" dir="ltr" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={mode === 'signin' ? 1 : 12} maxLength={128}/>{mode !== 'signin' && <span className="muted">{t('At least 12 characters.', '١٢ حرفًا على الأقل.')}</span>}</label>}
        {mode === 'reset' && <label className="field">{t('Confirm password', 'تأكيد كلمة المرور')}<input name="confirm" type="password" autoComplete="new-password" dir="ltr" required minLength={12} maxLength={128}/></label>}
        {message && <p role={failed ? 'alert' : 'status'} className={'notice' + (failed ? ' error' : '')}>{message}</p>}
        <button className="btn" disabled={busy}>{busy ? t('Please wait...', 'يرجى الانتظار...') : mode === 'signup' ? t('Create account', 'إنشاء حساب') : mode === 'forgot' ? t('Send reset link', 'إرسال رابط الاستعادة') : mode === 'reset' ? t('Save password', 'حفظ كلمة المرور') : t('Sign in', 'تسجيل الدخول')}</button>
      </form>
      {mode === 'signin' && <><button type="button" className="back-link" disabled={busy} onClick={() => change('forgot')}>{t('Forgot password?', 'نسيت كلمة المرور؟')}</button><button type="button" className="back-link" disabled={busy} onClick={() => change('signup')}>{t('Create an account', 'إنشاء حساب جديد')}</button></>}
      {(mode === 'signup' || mode === 'forgot') && <button type="button" className="back-link" disabled={busy} onClick={() => change('signin')}>{t('Back to sign in', 'العودة إلى تسجيل الدخول')}</button>}
    </>}
    <Link href="/" className="back-link">{t('Continue as a guest', 'المتابعة كضيف')}</Link>
  </section></main>;
}
