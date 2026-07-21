import type { ReactNode } from 'react';
import { getCastMemberByName } from '@/content/cast';
import { CharacterAvatar } from './ui/CharacterAvatar';

export interface MarginNoteProps {
  children: ReactNode;
  /** Raw cast name as captured from the markdown label (unresolved — see
   * the "unresolved name" doc note below). */
  name: string;
}

/**
 * MarginNote (design-brief §6/§9, BACKLOG "MarginNote component") — a
 * reviewer's aside in ballpoint script, riffing on/quipping about the
 * paragraph it follows. Never authored directly — `Markdown.tsx`'s
 * `blockquote` renderer produces this from an ordinary GFM blockquote whose
 * first line is a bold, colon-terminated `Margin note — {CastName}:` label
 * (see `src/lib/calloutTone.ts`'s `classifyMarginNote`/
 * `stripMarginNoteLabel`, checked BEFORE the `Callout` check so the two
 * label grammars never fight over the same blockquote).
 *
 * SHIPPED VERSION — v1 inline-everywhere (spec §3), NOT the desktop
 * anchored lane (spec's "DESKTOP LANE" section): this component renders the
 * identical bordered card at every breakpoint, in normal document flow,
 * always. The spec's sanctioned fallback clause: "if the desktop
 * anchored-lane (portal + ResizeObserver + position math — first use of
 * both in this codebase) risks shipping shaky measurement code, ship the
 * inline-everywhere v1 at every breakpoint instead — it's fully accessible,
 * fully §9 'never hidden' compliant, and matches what Callout/SectionByline
 * already ship." Taken deliberately: the lane's collision-push math can be
 * unit-tested as pure arithmetic, but the actual `getBoundingClientRect`
 * wiring it depends on can't be meaningfully verified in this repo's jsdom
 * test tooling — jsdom's layout engine returns an all-zero rect for every
 * element, so a rendered-DOM assertion on real measured positions would be
 * a fake-green test, not a real proof, and the codebase has zero prior
 * ResizeObserver/portal usage to model the wiring on. Shipping the
 * fully-provable, zero-new-primitive version over the higher-risk one
 * matches this task's explicit instruction to prefer the fallback rather
 * than ship unverified position math. The lane is a recommended fast-follow
 * (see PR description) — this component's public API (`{ children, name }`)
 * does not need to change to add it later; only its internal render would.
 *
 * Zero page wiring: `Markdown.tsx` has no page awareness (spec's "NO lane
 * provider present" state) and neither blog-post nor project-detail layout
 * needed to change for this to work in both.
 *
 * AUTHORING DISCIPLINE (not enforced by code, same as `Callout`'s binding
 * rule): a margin note is never the sole carrier of a fact the post depends
 * on — supplementary/quippy only. Avoid anchoring one to a post's very
 * first paragraph, where it crowds the provenance strip/card above it.
 *
 * Semantics: `<aside aria-label="Margin note from {Name}">` (matches
 * `Callout`'s `aria-label` pattern) — a landmark, not decorative. The
 * identity line (eyebrow + avatar + name) is plain mono, never
 * Caveat-only (design-brief §9's handwritten-face rule: decorative script
 * is never the sole carrier of information) — only the quip itself renders
 * in Caveat.
 *
 * Unresolved name: `getCastMemberByName` returns `undefined` for a name
 * that isn't one of the ten cast members (typo, or a name that hasn't
 * shipped studio-site work) — degrades to the raw label text with no
 * avatar, exactly like `SectionByline`'s existing degrade path. Never a
 * build failure.
 */
export function MarginNote({ children, name }: MarginNoteProps) {
  const member = getCastMemberByName(name);
  const displayName = member ? `${member.firstName}, ${member.name}` : name;

  return (
    // `-rotate-[1.5deg]` on a full-width card (design-brief §6): at this
    // shallow an angle the rotated bounding box only grows by
    // `height * sin(1.5deg) ≈ height * 0.0262` total, split across both
    // sides — a few px even for a very tall note, well inside Container's
    // 16px base-breakpoint side padding (`px-4`), so this never causes
    // horizontal scroll at 320px. Verified by hand, not just asserted.
    <aside
      aria-label={`Margin note from ${displayName}`}
      className="my-6 w-full -rotate-[1.5deg] rounded-sm border border-hairline bg-paper-raised p-4 shadow-[var(--shadow-card)]"
    >
      <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        Margin note
      </p>
      <p className="mb-2 flex items-center gap-2 font-mono text-[13px] text-ink-muted">
        {member && <CharacterAvatar id={member.id} tintVar={member.tintVar} name={member.name} size="inline" />}
        <span>{displayName}</span>
      </p>
      <div className="font-hand text-xl leading-snug text-marker-700 [&>p]:my-0">{children}</div>
    </aside>
  );
}
