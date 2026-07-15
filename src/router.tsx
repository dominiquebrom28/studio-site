import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { withSuspense } from './lib/withSuspense';

const Home = lazy(() => import('./pages/Home'));
const ProjectsIndex = lazy(() => import('./pages/ProjectsIndex'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const BlogIndex = lazy(() => import('./pages/BlogIndex'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Cast = lazy(() => import('./pages/Cast'));
const NotFound = lazy(() => import('./pages/NotFound'));

export const router = createBrowserRouter([
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
]);
