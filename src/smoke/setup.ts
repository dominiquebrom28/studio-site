/**
 * jsdom stubs for browser APIs the app calls that jsdom itself doesn't
 * implement — NOT app bugs. Without these, jsdom logs "Not implemented:
 * Window's X() method" through `console.error` on every call, which would
 * make the smoke suite's "no console errors" check fire on jsdom's own
 * gaps instead of real app problems. Kept to exactly what this app's
 * mounted components call (RootLayout's `ScrollToTop` calls
 * `window.scrollTo` on every route change) — not a speculative allowlist.
 */
window.scrollTo = () => {};

/**
 * jsdom has no `IntersectionObserver` at all (not even a "not implemented"
 * stub — it's simply `undefined`), and Framer Motion's `whileInView` (added
 * for `NarrativeBlock`, `BuildTimeline`, `MediaGallery`, `ProjectHero` —
 * docs/project-page-v2.md §5) constructs one on mount. A no-op class is
 * enough for the smoke suite's purpose: it only asserts on structural DOM
 * (h1 count, anchors, console errors), never on animated end-state, so an
 * observer that never actually fires a callback is a correct, honest stub
 * here — not a fake that would mask a real bug the way stubbing something
 * assertion-relevant would.
 */
class NoOpIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver = NoOpIntersectionObserver as unknown as typeof IntersectionObserver;

/**
 * jsdom has no `ResizeObserver` at all either — `BuildTimeline`'s
 * `useMeasuredCaptionHeights` (2026-07-19, replacing a character-count
 * height ESTIMATE with real DOM measurement, after that estimate was found
 * to genuinely overlap captions in a real browser) constructs one per
 * mounted project-detail page with a `process` block. A no-op observer that
 * never fires is the correct, honest stub here, same reasoning as
 * `NoOpIntersectionObserver` above: this suite only asserts on structural
 * DOM and the motion resting-state (never on measured pixel values, which
 * jsdom can't produce anyway — `getBoundingClientRect()` always returns
 * zeros here), so a dead observer never masks anything this suite could
 * have caught. `useMeasuredCaptionHeights`'s `FALLBACK_CAPTION_HEIGHT_PX`
 * keeps the layout in a valid, non-collapsed state when — as here —
 * measurement never actually arrives.
 */
class NoOpResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = NoOpResizeObserver as unknown as typeof ResizeObserver;
