import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { UpstreamRateLimitError, UpstreamError } from '../../errors/AppError';

let nasaClient: AxiosInstance | null = null;

export function getNasaHttpClient(): AxiosInstance {
  if (nasaClient) return nasaClient;

  nasaClient = axios.create({
    baseURL: env.NASA_API_BASE_URL,
    timeout: 10000,
    params: {
      api_key: env.NASA_API_KEY,
    },
  });

  axiosRetry(nasaClient, {
    retries: 2,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: AxiosError) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response?.status ?? 0) >= 500;
    },
  });

  nasaClient.interceptors.response.use(
    (response) => {
      const limit = response.headers['x-ratelimit-limit'];
      const remaining = response.headers['x-ratelimit-remaining'];
      if (limit && remaining) {
        const limitNum = parseInt(limit, 10);
        const remainingNum = parseInt(remaining, 10);
        if (remainingNum < limitNum * 0.1) {
          logger.warn(
            { limit: limitNum, remaining: remainingNum },
            'NASA rate limit remaining below 10%'
          );
        }
      }
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 429) {
        const retryAfter = (error.response.headers['retry-after'] as string) || '3600';
        logger.warn({ retryAfter }, 'NASA 429 rate limit hit');
        throw new UpstreamRateLimitError(retryAfter);
      }
      if (error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          const body = error.response.data as Record<string, unknown> | undefined;
          const message = (body?.error as string) || (body?.msg as string) || `NASA API error ${status}`;
          const nasaCode = body?.code;
          const details: Array<{ field?: string; issue: string }> = [];
          if (nasaCode) {
            details.push({ issue: `NASA error code: ${nasaCode}` });
          }
          details.push({ issue: String(message) });
          throw new UpstreamError(`NASA API returned ${status}: ${message}`, details);
        }
        if (status >= 500) {
          throw new UpstreamError(`NASA API server error: ${status}`);
        }
      }
      if (error.code === 'ECONNABORTED') {
        throw new UpstreamError('NASA API request timed out');
      }
      throw new UpstreamError(`NASA API request failed: ${error.message}`);
    }
  );

  return nasaClient;
}
