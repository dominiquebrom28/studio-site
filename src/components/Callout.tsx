import type { ReactNode } from 'react';
import { CALLOUT_TONE_LABEL, type CalloutTone } from '@/lib/calloutTone';

/**
 * Callout (docs/blog-format-v2.md §2) — an inline, visually distinct aside
 * inside the prose body: a note, a shipped win, or a risk/watch-out.
 *
 * Never authored directly — `Markdown.tsx`'s `blockquote` renderer produces
 * this from an ordinary GFM blockquote whose first line is a bold, colon-
 * terminated `Note:`/`Win:`/`Watch-out:` label (see `src/lib/calloutTone.ts`
 * for the classification/label-stripping logic). Any other blockquote
 * renders as `PullQuote` instead.
 *
 * Binding rule (mirrors `MarginNote` verbatim, design-brief §6/§9): a
 * Callout is never the sole carrier of a fact the post depends on — the
 * same fact must also exist in the post's ordinary body prose. That's an
 * authoring discipline, not something this component can enforce.
 *
 * Visual treatment — existing tokens only, no new palette: `radius-sm`,
 * `padding: var(--space-md)` (16px = `p-4`), one tone-colored 3px left
 * border, a mono 11px uppercase eyebrow label (Badge's type role, applied
 * to a block instead of a pill). `win`/`watch-out` reuse the exact
 * `color-mix(in srgb, {tone} 8%, var(--paper-raised))` wash `Badge`'s tint
 * variant already uses.
 */
export function Callout({ tone, children }: { tone: CalloutTone; children: ReactNode }) {
  const borderVar = tone === 'note' ? '--ink-muted' : tone === 'win' ? '--success' : '--warning';
  const background =
    tone === 'note' ? 'var(--paper-raised)' : `color-mix(in srgb, var(${borderVar}) 8%, var(--paper-raised))`;
  const labelColorClass = tone === 'note' ? 'text-ink-muted' : tone === 'win' ? 'text-success' : 'text-warning';

  return (
    <aside
      aria-label={CALLOUT_TONE_LABEL[tone]}
      className="my-6 rounded-sm p-4"
      style={{ borderLeft: `3px solid var(${borderVar})`, background }}
    >
      <p className={`mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] ${labelColorClass}`}>
        {CALLOUT_TONE_LABEL[tone]}
      </p>
      <div className="text-ink [&>p]:my-0">{children}</div>
    </aside>
  );
}
