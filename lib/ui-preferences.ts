import type {Locale} from './game/rules';

export function preferredLocale(value: string | undefined, languages: string | null): Locale {
  if (value === 'ar' || value === 'en') return value;
  const candidates = (languages || '').split(',').map(entry => {
    const [tag, weight] = entry.trim().toLowerCase().split(';');
    return {lang: tag.split('-')[0], q: weight ? Number(weight.trim().replace(/^q=/, '')) : 1};
  }).filter(item => (item.lang === 'ar' || item.lang === 'en') && item.q > 0 && item.q <= 1);
  candidates.sort((a, b) => b.q - a.q);
  return candidates[0]?.lang === 'ar' ? 'ar' : 'en';
}
