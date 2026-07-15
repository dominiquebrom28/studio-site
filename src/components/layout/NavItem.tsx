import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Active-route treatment: a hand-drawn SVG underline that "draws in"
 * (stroke-dashoffset) once when the link becomes active, then stays static
 * (design-brief §6 Header / §8 microinteractions). Because React mounts a
 * fresh underline element each time a *different* link becomes active, the
 * draw-in animation naturally plays once per route entry with no extra
 * session bookkeeping. `prefers-reduced-motion` renders it fully drawn,
 * instantly (see index.css global reduced-motion rule + the .animate-none
 * fallback below).
 */
export function NavItem({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `relative inline-flex min-h-11 items-center px-1 font-mono text-sm font-medium tracking-[0.02em] ${
          isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <svg
              className="absolute -bottom-1 left-0 h-1.5 w-full overflow-visible"
              viewBox="0 0 100 6"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M2 3.5 C 20 1, 40 5, 55 3 S 85 1.5, 98 3.5"
                fill="none"
                stroke="var(--marker-600)"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
                className="nav-underline-draw"
              />
            </svg>
          )}
        </>
      )}
    </NavLink>
  );
}
