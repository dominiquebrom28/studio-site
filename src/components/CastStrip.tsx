import { Link } from 'react-router-dom';
import { cast } from '@/content/cast';
import { CharacterAvatar } from './ui/CharacterAvatar';

const HERO_ROTATIONS = [-6, 4, -3, 7];

/**
 * Home hero's "passport stamp" cast strip (design-brief §5 Home).
 * Mobile: horizontally-scrollable strip. Desktop: static row, name/role
 * revealed on hover/focus (the link's accessible name always carries the
 * character name regardless of hover state, so keyboard/AT users are never
 * dependent on the visual reveal).
 */
export function CastStrip() {
  return (
    <div>
      <ul className="flex gap-3 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible" role="list">
        {cast.map((member, index) => (
          <li key={member.id}>
            <Link
              to="/cast"
              className="group relative inline-flex rounded-full focus-visible:outline-offset-4"
            >
              <CharacterAvatar
                id={member.id}
                tintVar={member.tintVar}
                name={member.name}
                size="hero"
                rotate={HERO_ROTATIONS[index % HERO_ROTATIONS.length]}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-hairline bg-paper-raised px-2 py-1 font-mono text-[11px] text-ink opacity-0 shadow-[var(--shadow-card)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {member.firstName} · {member.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
        {cast.length} characters, 0 ghostwriting
      </p>
    </div>
  );
}
