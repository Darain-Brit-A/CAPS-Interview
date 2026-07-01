import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { lazy, Suspense } from 'react';

const ApodPage = lazy(() =>
  import('@/features/apod/ApodPage').then((m) => ({ default: m.ApodPage }))
);
const MarsRoverPage = lazy(() =>
  import('@/features/mars-rover/MarsRoverPage').then((m) => ({ default: m.MarsRoverPage }))
);
const NeoPage = lazy(() =>
  import('@/features/neo/NeoPage').then((m) => ({ default: m.NeoPage }))
);
const FavoritesPanel = lazy(() =>
  import('@/features/favorites/FavoritesPanel').then((m) => ({ default: m.FavoritesPanel }))
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/apod" replace />,
      },
      {
        path: 'apod',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ApodPage />
          </Suspense>
        ),
      },
      {
        path: 'mars-rover',
        element: (
          <Suspense fallback={<PageLoader />}>
            <MarsRoverPage />
          </Suspense>
        ),
      },
      {
        path: 'neo',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NeoPage />
          </Suspense>
        ),
      },
      {
        path: 'favorites',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FavoritesPanel />
          </Suspense>
        ),
      },
    ],
  },
]);
