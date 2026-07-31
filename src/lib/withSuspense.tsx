import { Suspense, type ReactNode } from 'react';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { Container } from '@/components/ui/Container';

/**
 * CLS fix (docs/cls-fallback-decision.md, treatment A — cold deep-link load).
 * `min-h-[100svh]` (not `vh`, so mobile browser chrome collapsing doesn't
 * undercount) puts the persistent `<Footer>` (rendered by `RootLayout`,
 * below this fallback) strictly more than one viewport below the fold while
 * this is on screen — header height + 100svh. Per the Layout Instability
 * API's own visibility rule, a shift only counts an element that was visible
 * in the viewport the frame before it moved; once the footer starts below
 * the fold it never re-enters a previously-visible frame as real content
 * streams in taller, so its later jump to its final position stops counting.
 * See the decision doc for the full derivation (this does NOT depend on
 * matching any route's real content height).
 *
 * The "Loading…" text must stay legible on slow connections (no blank
 * screen) and must not gain a spinner/motion without a
 * `prefers-reduced-motion` fallback (design-brief §8/§9) — it stays plain
 * text, just centred instead of pinned near the top via `py-24`.
 */
export function RouteFallback() {
  return (
    <Container className="flex min-h-[100svh] items-center justify-center text-center">
      <p className="font-mono text-sm text-ink-muted">Loading…</p>
    </Container>
  );
}

/**
 * Used ONLY for the router's top-level `errorElement` (`router.tsx`) today —
 * NOT for per-route Suspense boundaries. See docs/cls-fallback-decision.md
 * treatment B: per-route boundaries were treatment B's bug (a fresh Suspense
 * instance on every navigation always shows its fallback, regardless of
 * react-router's `startTransition` wrapping, because there is no previously
 * committed state of THAT boundary to keep showing). The single stable
 * Suspense/RouteErrorBoundary pair for in-app navigation now lives in
 * `RootLayout`, wrapping `<Outlet />` once.
 *
 * `errorElement` fires only when an error escapes `RootLayout` itself (e.g. a
 * genuine router-level failure), a case with no `RootLayout` on screen to
 * hoist a boundary into — so it still needs its own fresh Suspense/error
 * boundary here.
 */
export function withSuspense(node: ReactNode) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{node}</Suspense>
    </RouteErrorBoundary>
  );
}
