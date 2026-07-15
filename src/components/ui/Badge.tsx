import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'muted' | 'tint';

const toneClasses: Record<Tone, string> = {
  success: 'bg-success/12 border-success/40 text-ink',
  warning: 'bg-warning/12 border-warning/40 text-ink',
  muted: 'bg-paper-raised border-hairline text-ink-muted',
  tint: 'text-ink',
};

export function Badge({
  children,
  tone = 'muted',
  tintVar,
  className = '',
  rotate,
}: {
  children: ReactNode;
  tone?: Tone;
  tintVar?: string;
  className?: string;
  rotate?: number;
}) {
  const tintStyle =
    tone === 'tint' && tintVar
      ? {
          backgroundColor: `color-mix(in srgb, var(--${tintVar}) 12%, var(--paper-raised))`,
          borderColor: `color-mix(in srgb, var(--${tintVar}) 40%, transparent)`,
        }
      : undefined;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono text-[11px] font-semibold uppercase tracking-[0.06em] px-2.5 py-1 ${toneClasses[tone]} ${className}`}
      style={{ ...tintStyle, transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    >
      {children}
    </span>
  );
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-hairline bg-paper-raised font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted px-2.5 py-1 ${className}`}
    >
      {children}
    </span>
  );
}
