import {ACCOUNT_POLICY_VERSION} from './policy';
export const SITE_INFO = {
  name: 'Hikmah | حكمة',
  email: 'Nuqat.app@gmail.com',
  origin: 'https://hikmahgame.com',
  policyVersion: ACCOUNT_POLICY_VERSION,
  operator: process.env.NEXT_PUBLIC_HIKMAH_OPERATOR || 'Areej Ali — Hikmah personal project / مشروع حكمة الشخصي',
  address: process.env.NEXT_PUBLIC_HIKMAH_BUSINESS_ADDRESS || 'Jeddah, Saudi Arabia / جدة، المملكة العربية السعودية',
  registration: process.env.NEXT_PUBLIC_HIKMAH_REGISTRATION || 'Personal project; no commercial registration / مشروع شخصي بلا سجل تجاري',
};

export const POLICY_LINKS = [
  ['/privacy', 'Privacy', 'الخصوصية'],
  ['/terms', 'Terms', 'الشروط'],
  ['/refunds', 'Fees and refunds', 'الرسوم والاسترداد'],
  ['/cookies', 'Cookies', 'ملفات الارتباط'],
  ['/contact', 'Contact and data rights', 'التواصل وحقوق البيانات'],
  ['/licenses', 'Credits and licences', 'المصادر والتراخيص'],
] as const;
