import { useState, useEffect } from 'react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
      You are currently offline. Some features may not be available.
    </div>
  );
}

export function RateLimitBanner() {
  const [dismissed, setDismissed] = useState(false);
  const isUsingBackend = Boolean(import.meta.env.VITE_API_BASE_URL);
  const hasApiKey = Boolean(import.meta.env.VITE_NASA_API_KEY);

  if (isUsingBackend || hasApiKey || dismissed) return null;

  return (
    <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4">
      <span>
        Using demo API key (30 requests/hour limit). Get a free key at{' '}
        <a
          href="https://api.nasa.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          api.nasa.gov
        </a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="text-white hover:opacity-80"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
