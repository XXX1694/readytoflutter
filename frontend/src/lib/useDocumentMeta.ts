import { useEffect } from 'react';

// Lightweight head-tag manager — sets <title>, the meta description, the
// canonical link, and the og/twitter image for the current route. Restores
// the previous values on unmount so navigating away doesn't leave stale
// meta lying around for the next page that doesn't override.
//
// We intentionally don't pull in react-helmet — we update so few tags that
// a 30-line custom hook is cheaper than another dependency, and prerender
// (Puppeteer) sees the post-effect DOM either way.

type Restorer = (() => void) | null;

function setMetaContent(selector: string, content: string | null | undefined): Restorer {
  if (!content) return null;
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) return null;
  const prev = el.getAttribute('content');
  el.setAttribute('content', content);
  return () => {
    if (prev === null) el.removeAttribute('content');
    else el.setAttribute('content', prev);
  };
}

function setLinkHref(rel: string, href: string | null | undefined): Restorer {
  if (!href) return null;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  let created = false;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
    created = true;
  }
  const prev = el.getAttribute('href');
  el.setAttribute('href', href);
  return () => {
    if (created) el!.remove();
    else if (prev === null) el!.removeAttribute('href');
    else el!.setAttribute('href', prev);
  };
}

export interface DocumentMetaInput {
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  ogImage?: string | null;
}

export function useDocumentMeta({ title, description, canonical, ogImage }: DocumentMetaInput): void {
  useEffect(() => {
    const restorers: Restorer[] = [];
    const prevTitle = document.title;
    if (title) document.title = title;

    if (description) {
      restorers.push(setMetaContent('meta[name="description"]', description));
      restorers.push(setMetaContent('meta[property="og:description"]', description));
      restorers.push(setMetaContent('meta[name="twitter:description"]', description));
    }
    if (title) {
      restorers.push(setMetaContent('meta[property="og:title"]', title));
      restorers.push(setMetaContent('meta[name="twitter:title"]', title));
    }
    if (ogImage) {
      const abs = ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage}`;
      restorers.push(setMetaContent('meta[property="og:image"]', abs));
      restorers.push(setMetaContent('meta[name="twitter:image"]', abs));
    }
    if (canonical) {
      const abs = canonical.startsWith('http') ? canonical : `${window.location.origin}${canonical}`;
      restorers.push(setLinkHref('canonical', abs));
      restorers.push(setMetaContent('meta[property="og:url"]', abs));
    }

    return () => {
      document.title = prevTitle;
      for (const r of restorers) r?.();
    };
  }, [title, description, canonical, ogImage]);
}
