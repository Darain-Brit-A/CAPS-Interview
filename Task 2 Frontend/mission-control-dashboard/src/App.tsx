import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { ThemeInitializer } from './components/layout/ThemeInitializer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
          Something went wrong
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-4">
          {errorMessage}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('Error caught by boundary:', error)}>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
