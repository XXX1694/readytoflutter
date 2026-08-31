import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Search } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { Button } from '../ui/index';

// Catch-all for unmatched routes. Without it a typo in the URL rendered an
// empty <div id="root"> — especially visible on GitHub Pages, where 404.html
// is a copy of index.html, so every bad path reaches the SPA router.
export default function NotFoundPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRu = lang === 'ru';

  useDocumentMeta({
    title: isRu ? 'Страница не найдена · Onsite' : 'Page not found · Onsite',
  });

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            404
          </span>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            {isRu ? 'Такой страницы нет' : 'No such page'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {isRu
              ? 'Ссылка битая или устарела. Вернись на главную или найди вопрос через поиск.'
              : 'The link is broken or out of date. Head back to the dashboard, or find the question through search.'}
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {isRu ? 'На главную' : 'Back to dashboard'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/search')}>
              <Search className="h-3.5 w-3.5" />
              {isRu ? 'Поиск' : 'Search'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/knowledge')}>
              <Compass className="h-3.5 w-3.5" />
              {isRu ? 'База знаний' : 'Knowledge base'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
