import type { ApiError } from '@/api/types';

interface ErrorStateProps {
  error: ApiError | Error;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const errorObj = error as ApiError;
  const isRateLimited = errorObj.code === 'RATE_LIMITED';

  const message = errorObj.message || error.message || 'An unexpected error occurred';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {isRateLimited ? 'Rate Limit Exceeded' : 'Error Loading Data'}
      </h3>
      <p className="text-[var(--color-text-secondary)] max-w-md mb-4">
        {message}
      </p>
      {isRateLimited && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
          You are using the demo API key which is rate-limited. Please wait
          before making more requests or configure a personal API key.
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p className="text-red-600 dark:text-red-400 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
