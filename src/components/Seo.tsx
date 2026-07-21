import { useEffect } from 'react';

const SITE_NAME = "Dom's AI Studio";

// Default social-share image, generated per the SEO/social-asset P0 (studio
// "logbook" stamp on ruled paper, 1200x630 — see public/og-default.png).
// Root-relative on purpose, same pattern as the `/feed.xml` link in
// index.html: resolved against whichever origin actually serves the page
// (prod, a Vercel preview, or localhost) via `window.location.origin` below,
// rather than a build-time-templated absolute string.
const DEFAULT_OG_IMAGE = '/og-default.png';

function setMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Resolves a root-relative or already-absolute URL against the current
 * origin — mirrors the `SITE_URL` fallback in
 * `scripts/generate-seo-files.mjs`, but computed at runtime from
 * `window.location` so it's automatically correct on prod, a Vercel
 * preview, or localhost without any build-time templating. */
function toAbsoluteUrl(path: string): string {
  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
}

/**
 * Sets `document.title` + meta description/OG/Twitter tags + canonical link
 * per page (spec §4 P1 `Seo`). A tiny effect hook, not
 * `react-helmet-async` — one more dependency this small SPA doesn't need.
 */
export function Seo({
  title,
  description,
  image = DEFAULT_OG_IMAGE,
}: {
  title: string;
  description: string;
  /** Root-relative (e.g. `/og-default.png`) or absolute image URL. Defaults
   * to the site-wide social-share image. */
  image?: string;
}) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    const canonicalUrl = toAbsoluteUrl(window.location.pathname);
    const absoluteImage = toAbsoluteUrl(image);

    document.title = fullTitle;
    setMetaTag('description', description);
    setMetaTag('og:title', fullTitle, 'property');
    setMetaTag('og:description', description, 'property');
    setMetaTag('og:type', 'website', 'property');
    setMetaTag('og:url', canonicalUrl, 'property');
    setMetaTag('og:image', absoluteImage, 'property');
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:image', absoluteImage);
    setLinkTag('canonical', canonicalUrl);
  }, [title, description, image]);

  return null;
}
