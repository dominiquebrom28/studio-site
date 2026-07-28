import type { ReactNode } from 'react';

/**
 * PullQuote (docs/blog-format-v2.md §2) — formalizes the existing default
 * `.prose-studio blockquote` treatment (italic, plain `--marker-600` left
 * border — see `index.css`, not the riso-offset accent (design-brief §4) —
 * design-brief §3's pull-quote type role) as a first-class,
 * separately named component. Visually and semantically a no-op: a plain
 * `<blockquote>`, styled entirely by the untouched `.prose-studio
 * blockquote` rule in `index.css` — this component exists only to give the
 * treatment a name and a place to draw the line against `Callout`.
 *
 * Authoring mechanism: any ordinary GFM blockquote whose first line is
 * *not* a recognized bold callout label (`Markdown.tsx`'s `blockquote`
 * renderer, `src/lib/calloutTone.ts`). Never attributed with a `<cite>` —
 * a pull-quote here restates the post's own claim, it doesn't quote a
 * third party.
 */
export function PullQuote({ children }: { children: ReactNode }) {
  return <blockquote>{children}</blockquote>;
}
