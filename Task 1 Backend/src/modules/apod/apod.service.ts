import { cacheWrap, buildCacheKey } from '../../cache/cacheService';
import { env } from '../../config/env';
import { fetchApodByDate, fetchApodByRange } from '../../integrations/nasa/apodClient';
import { NasaApodResponse } from '../../integrations/nasa/types';
import { ValidationError } from '../../errors/AppError';

export interface ApodEntry {
  date: string;
  title: string;
  explanation: string;
  mediaType: 'image' | 'video';
  url: string;
  hdurl: string | null;
  copyright: string | null;
}

export interface ApodResult {
  data: ApodEntry[];
  meta: {
    count: number;
    cached: boolean;
    source: string;
  };
}

function normalizeApod(raw: NasaApodResponse): ApodEntry {
  return {
    date: raw.date,
    title: raw.title,
    explanation: raw.explanation,
    mediaType: raw.media_type as 'image' | 'video',
    url: raw.url,
    hdurl: raw.hdurl || null,
    copyright: raw.copyright || null,
  };
}

function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export async function getApod(params: {
  date?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ApodResult> {
  const { date, start_date, end_date } = params;

  if (date) {
    const today = getTodayUTC();
    if (date > today) {
      throw new ValidationError('INVALID_DATE_FUTURE', 'Date cannot be in the future');
    }
    if (date < '1995-06-16') {
      throw new ValidationError('INVALID_DATE_TOO_EARLY', 'Date cannot be earlier than 1995-06-16');
    }

    const cacheKey = buildCacheKey('apod', `date=${date}`);
    const { value: raw, cached } = await cacheWrap<NasaApodResponse>(
      cacheKey,
      env.CACHE_TTL_APOD,
      () => fetchApodByDate(date)
    );

    return {
      data: [normalizeApod(raw)],
      meta: { count: 1, cached, source: 'nasa_apod_v1' },
    };
  }

  const effectiveStartDate = start_date || getTodayUTC();
  const effectiveEndDate = end_date || (start_date ? getTodayUTC() : getTodayUTC());

  const cacheKey = buildCacheKey('apod', `range=${effectiveStartDate}:${effectiveEndDate}`);
  const { value: raw, cached } = await cacheWrap<NasaApodResponse[]>(
    cacheKey,
    env.CACHE_TTL_APOD,
    () => fetchApodByRange(effectiveStartDate, effectiveEndDate)
  );

  const entries = Array.isArray(raw) ? raw.map(normalizeApod) : [normalizeApod(raw)];

  return {
    data: entries,
    meta: { count: entries.length, cached, source: 'nasa_apod_v1' },
  };
}
