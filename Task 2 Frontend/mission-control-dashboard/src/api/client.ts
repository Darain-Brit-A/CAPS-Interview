import type { ApiError } from './types';

const NASA_BASE_URL = 'https://api.nasa.gov';

function getBaseUrl(): string {
  const backendUrl = import.meta.env.VITE_API_BASE_URL;
  if (backendUrl) {
    return backendUrl;
  }
  return NASA_BASE_URL;
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_NASA_API_KEY;
}

function isUsingBackend(): boolean {
  return Boolean(import.meta.env.VITE_API_BASE_URL);
}

export async function apiFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl);

  // Add API key if not using backend
  if (!isUsingBackend()) {
    const apiKey = getApiKey() || 'DEMO_KEY';
    url.searchParams.set('api_key', apiKey);
  }

  // Add other params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        message: `API request failed: ${response.statusText}`,
        code: 'UNKNOWN',
      };

      if (response.status === 429) {
        error.code = 'RATE_LIMITED';
        error.message = 'Rate limit exceeded. Please wait before making more requests.';
      } else if (response.status >= 400 && response.status < 500) {
        error.code = 'API_ERROR';
      }

      throw error;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      throw error;
    }

    const networkError: ApiError = {
      status: 0,
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
    };
    throw networkError;
  }
}
