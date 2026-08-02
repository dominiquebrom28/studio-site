import { describe, it, expect, afterEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { CharacterEntry } from './cast';

/**
 * Structural regression coverage for the headcount-truth backlog item:
 * "the site's own footer copy says '10 AI characters' [and other surfaces
 * assert counts too] — make them agree, or state the count in exactly one
 * place and derive it... there must be a test that fails if `cast.ts`
 * grows and a rendered count does not follow."
 *
 * `Footer`, `CastStrip`, `Cast`, and `Home` all now read their headcount
 * copy from `cast.length`/`specialists.length` instead of a hardcoded
 * literal (see each file's own comment). That's necessary but not
 * sufficient proof — a component could still coincidentally render the
 * right number today while secretly holding a hardcoded string. This
 * suite mocks `@/content/cast` down to a 4-member roster (1 lead + 3
 * specialists, reusing real sliced entries rather than fabricating data)
 * and asserts every derived surface actually reflects the SMALLER,
 * DIFFERENT number — proving the count is computed, not coincidental.
 *
 * `vi.mock` is file-scoped and hoisted, which is exactly why this lives in
 * its own file rather than inside `Footer.test.tsx`/`Home.test.tsx`: those
 * files assert the real, current ten-member roster and must not be
 * affected by this mock.
 */
vi.mock('@/content/cast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cast')>();
  const fakeCast: readonly CharacterEntry[] = actual.cast.slice(0, 4);
  const fakeSpecialists = fakeCast.filter((member) => !member.isLead);
  const fakeProjectLead = fakeCast.find((member) => member.isLead)!;
  return {
    ...actual,
    cast: fakeCast,
    specialists: fakeSpecialists,
    projectLead: fakeProjectLead,
  };
});

// Guard the fixture itself: if `cast.ts`'s first four entries ever stop
// being "1 lead + 3 specialists" (e.g. someone reorders the array so the
// lead isn't first), this whole suite would silently start asserting
// against a differently-shaped fake roster. Fail loudly instead.
describe('fixture sanity', () => {
  it('the first four real cast entries are exactly one lead and three specialists', async () => {
    const { cast: realCast } = await vi.importActual<typeof import('./cast')>('./cast');
    const firstFour = realCast.slice(0, 4);
    expect(firstFour.filter((member) => member.isLead).length).toBe(1);
    expect(firstFour.length).toBe(4);
  });
});

afterEach(() => {
  cleanup();
});

describe('Footer — character count follows cast.ts, not a hardcoded literal', () => {
  it('renders the mocked 4-member count, not the real 10', async () => {
    const { Footer } = await import('@/components/layout/Footer');
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Dom runs this studio.*reviews and merges everything the 4 AI characters ship/s),
    ).toBeTruthy();
    expect(
      screen.getByText('Built by an AI team — 1 human + 4 AI characters, nothing ghostwritten.'),
    ).toBeTruthy();
    expect(screen.queryByText(/10 AI characters/)).toBeNull();
  });
});

describe('CastStrip — caption count follows cast.ts, not a hardcoded literal', () => {
  it('renders the mocked 4-member count, not the real 10', async () => {
    const { CastStrip } = await import('@/components/CastStrip');
    render(
      <MemoryRouter>
        <CastStrip />
      </MemoryRouter>,
    );

    expect(screen.getByText('4 characters, 0 ghostwriting')).toBeTruthy();
    expect(screen.queryByText(/10 characters, 0 ghostwriting/)).toBeNull();
  });
});

describe('Cast page — intro count follows cast.ts, not a hardcoded literal', () => {
  it('renders the mocked 4-member count and exactly the mocked 3 specialist cards', async () => {
    const { default: Cast } = await import('@/pages/Cast');
    render(
      <MemoryRouter>
        <main>
          <Cast />
        </main>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/^4 AI characters and one human ship this site\./),
    ).toBeTruthy();
    expect(screen.queryByText(/^10 AI characters/)).toBeNull();
    // 3 mocked specialists + 1 mocked lead = 4 headings total (h2 for both
    // in this render, since Cast always passes headingLevel={2}).
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(4);
  });
});

describe('Home — hero eyebrow count follows cast.ts, not a hardcoded literal', () => {
  it('renders the mocked 4-member count, not the real 10', async () => {
    const { default: Home } = await import('@/pages/Home');
    render(
      <MemoryRouter initialEntries={['/']}>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Studio logbook — 1 human + 4 AI characters')).toBeTruthy();
    });
    expect(screen.queryByText(/1 human \+ 10 AI characters/)).toBeNull();
  });
});
