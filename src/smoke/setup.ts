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
