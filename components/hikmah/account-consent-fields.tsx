'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ACCOUNT_POLICY_VERSION,type AccountCapacity} from '@/lib/policy';
import type {Props} from './shared';

export function consentFromForm(form:FormData) {
 return {
  version:ACCOUNT_POLICY_VERSION,
  capacity:form.get('capacity'),
  relationship:form.get('relationship'),
  accepted:form.has('termsAccepted'),
  legalCapacity:form.has('legalCapacity'),
  childDataConsent:form.has('childDataConsent'),
 };
}

export function AccountConsentFields({t}:{t:Props['t']}){
 const [capacity,setCapacity]=useState<AccountCapacity>('self');
 return <>
  <fieldset className="stack">
   <legend>{t('Who manages this account?','من يدير هذا الحساب؟')}</legend>
   <label className="check-field"><input type="radio" name="capacity" value="self" checked={capacity==='self'} onChange={()=>setCapacity('self')}/>{t('I manage my own account.','أدير حسابي بنفسي.')}</label>
   <label className="check-field"><input type="radio" name="capacity" value="guardian" checked={capacity==='guardian'} onChange={()=>setCapacity('guardian')}/>{t('I manage this account as the player’s legal guardian.','أدير هذا الحساب بصفتي الولي النظامي للاعب.')}</label>
  </fieldset>
  {capacity==='guardian'&&<>
   <label className="field">{t('Your authority','صفتك')}<select name="relationship"><option value="parent">{t('Parent with legal guardianship','أحد الوالدين وله الولاية النظامية')}</option><option value="legal_guardian">{t('Other legally appointed guardian','ولي أو وصي معين نظامًا')}</option></select></label>
   <p>{t('Use your own email and a nickname for the player. We may need to verify guardianship.','استخدم بريدك الإلكتروني واسمًا مستعارًا للاعب. قد نحتاج إلى التحقق من الولاية النظامية.')}</p>
   <label className="check-field"><input type="checkbox" name="childDataConsent" required/>{t('I confirm my legal guardianship and authorise the player’s nickname, progress and public game results as described in the privacy notice.','أؤكد ولايتي النظامية وأوافق على معالجة اسم اللاعب المستعار وتقدمه ونتائج لعبه الظاهرة وفق إشعار الخصوصية.')}</label>
  </>}
  <label className="check-field"><input type="checkbox" name="legalCapacity" required/>{t('I have legal capacity to create this account, and the email address is mine.','أملك أهلية إنشاء هذا الحساب، والبريد الإلكتروني يخصني.')}</label>
  <label className="check-field"><input type="checkbox" name="termsAccepted" required/><span>{t('I accept the ','أوافق على ')}<Link href="/terms" target="_blank">{t('terms','الشروط')}</Link>{t(' and have read the ',' واطلعت على ')}<Link href="/privacy" target="_blank">{t('privacy notice','إشعار الخصوصية')}</Link>.</span></label>
 </>;
}
