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
