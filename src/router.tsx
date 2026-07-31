import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { withSuspense } from './lib/withSuspense';

const Home = lazy(() => import('./pages/Home'));
const ProjectsIndex = lazy(() => import('./pages/ProjectsIndex'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const BlogIndex = lazy(() => import('./pages/BlogIndex'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Cast = lazy(() => import('./pages/Cast'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Exported separately from the `router` singleton below so the smoke-test
// suite (src/smoke/) can build its own `createMemoryRouter(routes, {...})`
// per route under test, without touching `window.history`/`window.location`
// (which is what a single shared `createBrowserRouter` instance is pinned
// to at construction time). This is the same route tree either way — no
// behavior change for the real app.
// Route elements below are NOT individually wrapped in Suspense/error
// boundaries (docs/cls-fallback-decision.md, treatment B) — `RootLayout`
// hoists a single stable `<Suspense>`/`<RouteErrorBoundary>` pair around
// `<Outlet />` instead. A fresh per-route boundary always shows its
// fallback on navigation (there is no previously-committed state of a
// brand-new instance to hold onto); a single boundary that persists across
// navigations lets react-router v7's unconditional `startTransition`
// wrapping keep the last-committed route on screen until the next one
// resolves. `errorElement` is the one exception: it only fires for an error
// that escapes `RootLayout` itself, so there is no hoisted boundary to
// catch it and it needs its own self-contained fallback.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: withSuspense(<NotFound />),
    children: [
      { index: true, element: <Home /> },
      { path: 'projects', element: <ProjectsIndex /> },
      { path: 'projects/:slug', element: <ProjectDetail /> },
      { path: 'blog', element: <BlogIndex /> },
      { path: 'blog/:slug', element: <BlogPost /> },
      { path: 'cast', element: <Cast /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
