import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { GrainOverlay } from '../ui/GrainOverlay';
import { RouteErrorBoundary } from '../RouteErrorBoundary';
import { RouteFallback } from '@/lib/withSuspense';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function RootLayout() {
  const { pathname } = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <GrainOverlay />
      <ScrollToTop />
      <Header />
      <main id="main-content" className="flex-1">
        {/*
          A SINGLE stable Suspense/error boundary pair for the entire route
          tree (docs/cls-fallback-decision.md treatment B), not one fresh
          pair per route. In-app navigation is then an UPDATE to an
          already-mounted Suspense boundary rather than a fresh mount, so
          react-router v7's unconditional `startTransition` wrapping of
          navigation state (confirmed in
          node_modules/react-router/dist/development/chunk-SA4DP3SF.js's
          `RouterProvider` `setState`) keeps the last-committed route on
          screen until the next one's chunk resolves — no fallback flash,
          no footer jump, for in-app transitions.

          `resetKey={pathname}` clears a caught render error on navigation
          via `RouteErrorBoundary`'s `componentDidUpdate`, WITHOUT using
          `key={pathname}` — a keyed remount would remount this `<Suspense>`
          too and reintroduce the exact bug this hoist fixes. See
          `RouteErrorBoundary`'s prop doc comment.
        */}
        <RouteErrorBoundary resetKey={pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
