import type { SVGProps } from 'react';
import type { CharacterId } from '@/content/cast';

/**
 * Monoline single-glyph icons — one per character (design-brief §7 / §10).
 * Deliberately NOT faces: a passport-stamp glyph reinforces "provenance,"
 * never "mascot." `currentColor` stroke so the parent avatar controls color.
 */
type GlyphProps = SVGProps<SVGSVGElement>;

const shared: GlyphProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function LeadGlyph(props: GlyphProps) {
  // open notebook
  return (
    <svg {...shared} {...props}>
      <path d="M12 6c-1.8-1.2-4-1.5-6.5-1v13c2.5-.5 4.7-.2 6.5 1 1.8-1.2 4-1.5 6.5-1V5c-2.5-.5-4.7-.2-6.5 1Z" />
      <path d="M12 6v13" />
      <path d="M7 8.5h2.2M7 11.5h2.2M14.8 8.5H17M14.8 11.5H17" />
    </svg>
  );
}

function ArchitectGlyph(props: GlyphProps) {
  // T-square / ruler
  return (
    <svg {...shared} {...props}>
      <path d="M4 5h16v3H12v11" />
      <path d="M7 5v3M10 5v3M14 8v2M17 8v2M20 8v2" />
    </svg>
  );
}

function DesignerGlyph(props: GlyphProps) {
  // fountain-pen nib
  return (
    <svg {...shared} {...props}>
      <path d="M12 3 6 13.5 12 21l6-7.5L12 3Z" />
      <path d="M12 8v8" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FrontendGlyph(props: GlyphProps) {
  // browser-window bracket </>
  return (
    <svg {...shared} {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="1" />
      <path d="M3.5 8.5h17" />
      <path d="M10 12l-2 2 2 2M14 12l2 2-2 2" />
    </svg>
  );
}

function BackendGlyph(props: GlyphProps) {
  // stacked database cylinder
  return (
    <svg {...shared} {...props}>
      <ellipse cx="12" cy="6" rx="6.5" ry="2.4" />
      <path d="M5.5 6v5.5c0 1.3 2.9 2.4 6.5 2.4s6.5-1.1 6.5-2.4V6" />
      <path d="M5.5 11.5V17c0 1.3 2.9 2.4 6.5 2.4s6.5-1.1 6.5-2.4v-5.5" />
    </svg>
  );
}

function DevopsGlyph(props: GlyphProps) {
  // pipeline / gear
  return (
    <svg {...shared} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.8 6.8l1.4 1.4M15.8 15.8l1.4 1.4M6.8 17.2l1.4-1.4M15.8 8.2l1.4-1.4" />
    </svg>
  );
}

function SecurityGlyph(props: GlyphProps) {
  // rubber stamp
  return (
    <svg {...shared} {...props}>
      <rect x="6" y="4" width="12" height="7" rx="1" />
      <path d="M9 11v3.5h6V11" />
      <path d="M5 18.5h14" />
      <path d="M7.5 18.5V16a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2.5" />
    </svg>
  );
}

function QaGlyph(props: GlyphProps) {
  // magnifying glass over checkbox
  return (
    <svg {...shared} {...props}>
      <rect x="4" y="4" width="11" height="11" rx="1" />
      <path d="M7 9.5l2 2 3.5-4" />
      <circle cx="16.5" cy="16.5" r="3.2" />
      <path d="M18.9 18.9 21 21" />
    </svg>
  );
}

function MarketerGlyph(props: GlyphProps) {
  // megaphone
  return (
    <svg {...shared} {...props}>
      <path d="M4 10v4h2.5L13 18v-12L6.5 10H4Z" />
      <path d="M13 8.5c2 .8 3.5 2 3.5 3.5s-1.5 2.7-3.5 3.5" />
      <path d="M7.5 14.5 8.7 18" />
    </svg>
  );
}

export const glyphs: Record<CharacterId, (props: GlyphProps) => React.JSX.Element> = {
  lead: LeadGlyph,
  architect: ArchitectGlyph,
  designer: DesignerGlyph,
  frontend: FrontendGlyph,
  backend: BackendGlyph,
  devops: DevopsGlyph,
  security: SecurityGlyph,
  qa: QaGlyph,
  marketer: MarketerGlyph,
};
