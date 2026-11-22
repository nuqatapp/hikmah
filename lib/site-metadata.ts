export const publicPages=['/','/leaderboard','/privacy','/terms','/contact','/cookies','/refunds','/licenses'] as const;
export const siteUrl='https://hikmahgame.com';
export const pageTitles:Record<string,readonly [string,string]>={
  '/':['Wisdom games','ألعاب الحكمة'],
  '/play':['Play','العب'],
  '/multiplayer':['Play together','العب مع الأصدقاء'],
  '/leaderboard':['Leaderboard','المتصدرون'],
  '/profile':['My journey','رحلتي'],
  '/settings':['Settings','الإعدادات'],
  '/admin':['Administration','الإدارة'],
  '/login':['Sign in','تسجيل الدخول'],
  '/reset-password':['Reset password','إعادة تعيين كلمة المرور'],
  '/auth/confirm':['Confirm email','تأكيد البريد'],
  '/privacy':['Privacy','الخصوصية'],
  '/terms':['Terms','الشروط'],
  '/cookies':['Cookies','ملفات الارتباط'],
  '/contact':['Contact','تواصل معنا'],
  '/refunds':['Refunds','الاسترداد'],
  '/licenses':['Credits and licences','المصادر والتراخيص'],
};
