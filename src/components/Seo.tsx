import { useEffect } from 'react';

const SITE_NAME = 'Studio Logbook';

function setMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets `document.title` + meta description/OG tags per page (spec §4 P1
 * `Seo`). A tiny effect hook, not `react-helmet-async` — one more dependency
 * this small SPA doesn't need.
 */
export function Seo({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;
    setMetaTag('description', description);
    setMetaTag('og:title', fullTitle, 'property');
    setMetaTag('og:description', description, 'property');
    setMetaTag('og:type', 'website', 'property');
  }, [title, description]);

  return null;
}
