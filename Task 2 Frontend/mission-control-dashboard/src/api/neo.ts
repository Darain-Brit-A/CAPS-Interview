import { apiFetch } from './client';
import type { NeoFeedResponse, NeoObject } from './types';

export const neoKeys = {
  all: ['neo'] as const,
  feed: (startDate: string, endDate: string) =>
    [...neoKeys.all, 'feed', startDate, endDate] as const,
};

// Maximum 7-day span per NASA API request
const MAX_DATE_RANGE_DAYS = 7;

function getDayRange(start: string, end: string): string[] {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const days: string[] = [];

  let currentMs = startMs;
  while (currentMs <= endMs) {
    days.push(new Date(currentMs).toISOString().split('T')[0]);
    currentMs += 24 * 60 * 60 * 1000;
  }

  return days;
}

function chunkDateRange(
  start: string,
  end: string
): Array<{ start: string; end: string }> {
  const days = getDayRange(start, end);
  const chunks: Array<{ start: string; end: string }> = [];

  for (let i = 0; i < days.length; i += MAX_DATE_RANGE_DAYS) {
    const chunkDays = days.slice(i, i + MAX_DATE_RANGE_DAYS);
    chunks.push({
      start: chunkDays[0],
      end: chunkDays[chunkDays.length - 1],
    });
  }

  return chunks;
}

export async function fetchNeoFeed(
  startDate: string,
  endDate: string
): Promise<NeoObject[]> {
  const chunks = chunkDateRange(startDate, endDate);

  // Fetch all chunks in parallel
  const responses = await Promise.all(
    chunks.map((chunk) =>
      apiFetch<NeoFeedResponse>('/neo/rest/v1/feed', {
        start_date: chunk.start,
        end_date: chunk.end,
      })
    )
  );

  // Merge and deduplicate results
  const allObjects = new Map<string, NeoObject>();

  responses.forEach((response) => {
    Object.values(response.near_earth_objects).forEach((objects) => {
      objects.forEach((obj) => {
        allObjects.set(obj.id, obj);
      });
    });
  });

  // Sort by close approach date
  const result = Array.from(allObjects.values());
  result.sort((a, b) => {
    const dateA = a.close_approach_data[0]?.close_approach_date || '';
    const dateB = b.close_approach_data[0]?.close_approach_date || '';
    return dateA.localeCompare(dateB);
  });

  return result;
}
