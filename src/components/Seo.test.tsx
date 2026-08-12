import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Seo } from './Seo';

/**
 * Pre-launch review fix (P3, "every nonexistent URL is an indexable,
 * self-canonicalising soft-404"): `vercel.json`'s SPA rewrite returns 200 for
 * any path, and `Seo` previously always set a canonical link derived from
 * `window.location.pathname` — including on `NotFound`, which would
 * canonicalize to whatever arbitrary (possibly spammy) path the visitor
 * requested. `noindex` emits `<meta name="robots" content="noindex">` and
 * skips the canonical link instead.
 *
 * `Seo` mutates `document.head` imperatively and reuses tags by selector
 * across renders/mounts rather than removing them on unmount — so the
 * riskiest failure mode here isn't "does noindex get set on the 404 page,"
 * it's "does a stale `noindex` (or a stale/missing canonical) leak onto the
 * NEXT page after a route change away from a noindex page." These tests
 * assert that transition explicitly, in both directions.
 */

function robotsMeta() {
  return document.head.querySelector('meta[name="robots"]');
}

function canonicalLink() {
  return document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
}

afterEach(() => {
  cleanup();
  // Seo never removes tags on unmount by design (see component doc) — clean
  // the real jsdom `document.head` between tests ourselves so one test's
  // leftover tags can't mask (or fake) the next test's assertions.
  robotsMeta()?.remove();
  canonicalLink()?.remove();
});

describe('Seo — ordinary page', () => {
  it('sets a canonical link and no robots meta tag', () => {
    render(<Seo title="Projects" description="Project index." />);
    expect(canonicalLink()).not.toBeNull();
    expect(robotsMeta()).toBeNull();
  });
});

describe('Seo — noindex page', () => {
  it('sets robots noindex and does NOT set a canonical link', () => {
    render(<Seo title="404 — Studio Logbook" description="Not found." noindex />);
    expect(robotsMeta()?.getAttribute('content')).toBe('noindex');
    expect(canonicalLink()).toBeNull();
  });

  it('does not leak a stale canonical from a PRIOR real page onto a noindex page', () => {
    const { unmount } = render(<Seo title="Projects" description="Project index." />);
    expect(canonicalLink()).not.toBeNull();
    unmount();

    render(<Seo title="404 — Studio Logbook" description="Not found." noindex />);
    expect(canonicalLink()).toBeNull();
    expect(robotsMeta()?.getAttribute('content')).toBe('noindex');
  });

  it('does not leak a stale robots=noindex onto the NEXT real page after navigating away from a noindex page', () => {
    // This is the one direction that can do real damage: if a stray
    // `noindex` tag survives a route change, a real page silently stops
    // being indexed with no visible symptom.
    const { unmount } = render(<Seo title="404 — Studio Logbook" description="Not found." noindex />);
    expect(robotsMeta()?.getAttribute('content')).toBe('noindex');
    unmount();

    render(<Seo title="Projects" description="Project index." />);
    expect(robotsMeta()).toBeNull();
    expect(canonicalLink()).not.toBeNull();
  });

  it('re-render with the same Seo instance (noindex prop flips) also clears the stale tag, not just remount', () => {
    function Wrapper({ noindex }: { noindex: boolean }) {
      return <Seo title="Some page" description="Some description." noindex={noindex} />;
    }
    const { rerender } = render(<Wrapper noindex />);
    expect(robotsMeta()?.getAttribute('content')).toBe('noindex');
    expect(canonicalLink()).toBeNull();

    rerender(<Wrapper noindex={false} />);
    expect(robotsMeta()).toBeNull();
    expect(canonicalLink()).not.toBeNull();

    rerender(<Wrapper noindex />);
    expect(robotsMeta()?.getAttribute('content')).toBe('noindex');
    expect(canonicalLink()).toBeNull();
  });
});
