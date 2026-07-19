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
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: withSuspense(<NotFound />),
    children: [
      { index: true, element: withSuspense(<Home />) },
      { path: 'projects', element: withSuspense(<ProjectsIndex />) },
      { path: 'projects/:slug', element: withSuspense(<ProjectDetail />) },
      { path: 'blog', element: withSuspense(<BlogIndex />) },
      { path: 'blog/:slug', element: withSuspense(<BlogPost />) },
      { path: 'cast', element: withSuspense(<Cast />) },
      { path: '*', element: withSuspense(<NotFound />) },
    ],
  },
];

export const router = createBrowserRouter(routes);
