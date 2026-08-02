import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import Cast from './Cast';
import { cast } from '@/content/cast';

/**
 * Pins the Cast page's REAL rendered intro against the REAL roster.
 *
 * This is the companion to `src/content/castRenderedCount.test.tsx`, and the
 * two prove different halves. That file mocks `cast.ts` down to four members
 * to prove the count is genuinely *derived* rather than a coincidental
 * literal; because `vi.mock` is file-scoped and hoisted, it structurally
 * cannot also assert what the page says today. This file does that: it
 * renders against the unmocked roster and pins the exact public sentence.
 *
 * Why the copy is worth pinning and not just the number: the count on this
 * page is SPELLED OUT ("Ten"), while Footer/Home/CastStrip use the digit
 * ("1 human + 10 AI characters"). That split is deliberate — see Cast.tsx —
 * and it is exactly the kind of distinction a future "just interpolate the
 * number" refactor flattens without noticing, leaving a sentence that opens
 * with a numeral and then pairs it with a spelled-out "one human".
 */
describe('Cast page — real rendered intro copy', () => {
  afterEach(cleanup);

  it('opens with the spelled-out count, matching the real ten-member roster', () => {
    render(
      <MemoryRouter>
        <Cast />
      </MemoryRouter>,
    );

    // Guard the premise: if the roster ever leaves the spell-out table's
    // range, this assertion's expected word would silently go stale.
    expect(cast.length).toBe(10);

    expect(
      screen.getByText(/^Ten AI characters and one human ship this site\./),
    ).toBeTruthy();
  });

  it('never opens that sentence with a bare numeral', () => {
    render(
      <MemoryRouter>
        <Cast />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/^\d+ AI characters and one human/)).toBeNull();
  });
});
