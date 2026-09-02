import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useNotFoundCopy } from '../i18n/staticPages';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { EmptyState, PageShell } from '../ui/index';

// Catch-all for unmatched routes. Without it a typo in the URL rendered an
// empty <div id="root"> — especially visible on GitHub Pages, where 404.html
// is a copy of index.html, so every bad path reaches the SPA router.
export default function NotFoundPage() {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useNotFoundCopy(lang);

  useDocumentMeta({ title: c.docTitle });

  return (
    <PageShell width="narrow" centered>
      {/* The empty state carries the message; the h1 keeps the prerender
          contract every route holds to. */}
      <h1 className="sr-only">{c.title}</h1>
      <EmptyState
        title={c.title}
        body={c.body}
        action={{ label: t.nav.today, to: '/' }}
        secondary={{ label: t.nav.topics, to: '/topics' }}
      />
    </PageShell>
  );
}
