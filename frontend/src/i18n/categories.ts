import type { Lang } from './LangContext';

// Topic categories come from the seed in English; the few that are words
// rather than product names get a Russian label.
const RU: Record<string, string> = {
  State: 'Состояние',
  Quality: 'Качество',
  Architecture: 'Архитектура',
  'CS Fundamentals': 'Основы CS',
  Native: 'Нативный код',
  'Cross-Platform': 'Кросс-платформа',
  Mobile: 'Мобильная разработка',
};

export const categoryLabel = (lang: Lang, category: string): string =>
  (lang === 'ru' ? RU[category] : undefined) ?? category;
