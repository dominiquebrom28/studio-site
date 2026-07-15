import type { CharacterId } from '@/content/cast';
import { glyphs } from './glyphs';

const sizeMap = {
  inline: 24,
  card: 40,
  byline: 56,
  hero: 96,
} as const;

export type AvatarSize = keyof typeof sizeMap;

export interface CharacterAvatarProps {
  id: CharacterId;
  tintVar: string;
  name: string;
  size?: AvatarSize;
  /** Cast page enables the -3deg hover tilt (design-brief §6/§8); off elsewhere. */
  interactiveTilt?: boolean;
  rotate?: number;
  className?: string;
}

/**
 * The "stamp": circular, monoline single-glyph icon, tint fill, ink ring.
 * Deliberately not a face-avatar (design-brief §7/§10).
 */
export function CharacterAvatar({
  id,
  tintVar,
  name,
  size = 'card',
  interactiveTilt = false,
  rotate,
  className = '',
}: CharacterAvatarProps) {
  const Glyph = glyphs[id];
  const px = sizeMap[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-[var(--ink)]/20 ${
        interactiveTilt ? 'transition-transform duration-150 ease-out hover:-rotate-3 motion-reduce:hover:rotate-0' : ''
      } ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: `var(--${tintVar})`,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
      role="img"
      aria-label={name}
    >
      <Glyph
        className="text-[var(--ink)]"
        style={{ width: px * 0.55, height: px * 0.55 }}
        aria-hidden="true"
      />
    </span>
  );
}
