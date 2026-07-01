import type { ApodResponse } from './types';
import { apiFetch } from './client';

export const apodKeys = {
  all: ['apod'] as const,
  byDate: (date: string) => [...apodKeys.all, date] as const,
  byRange: (start: string, end: string) => [...apodKeys.all, 'range', start, end] as const,
};

export async function fetchApodByDate(date: string): Promise<ApodResponse> {
  return apiFetch<ApodResponse>('/planetary/apod', {
    date,
    thumbs: true,
  });
}

export async function fetchApodRange(
  startDate: string,
  endDate: string
): Promise<ApodResponse[]> {
  return apiFetch<ApodResponse[]>('/planetary/apod', {
    start_date: startDate,
    end_date: endDate,
    thumbs: true,
  });
}
