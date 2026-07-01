import { cacheWrap, buildCacheKey } from '../../cache/cacheService';
import { env } from '../../config/env';
import { fetchNeoFeed } from '../../integrations/nasa/neoClient';
import { NasaNearEarthObject, NasaNeoFeedResponse } from '../../integrations/nasa/types';

export interface NeoEntry {
  id: string;
  name: string;
  estimatedDiameterKm: { min: number; max: number };
  isPotentiallyHazardous: boolean;
  closeApproachDate: string;
  missDistanceKm: number;
  relativeVelocityKmS: number;
}

export interface NeoResult {
  data: NeoEntry[];
  meta: {
    count: number;
    elementCount: number;
    cached: boolean;
    startDate: string;
    endDate: string;
    source: string;
  };
}

function normalizeNeoObject(raw: NasaNearEarthObject): NeoEntry | null {
  if (raw.close_approach_data.length === 0) return null;

  const approach = raw.close_approach_data[0];
  return {
    id: raw.id,
    name: raw.name,
    estimatedDiameterKm: {
      min: parseFloat(raw.estimated_diameter.kilometers.estimated_diameter_min.toFixed(6)),
      max: parseFloat(raw.estimated_diameter.kilometers.estimated_diameter_max.toFixed(6)),
    },
    isPotentiallyHazardous: raw.is_potentially_hazardous_asteroid,
    closeApproachDate: approach.close_approach_date,
    missDistanceKm: parseFloat(parseFloat(approach.miss_distance.kilometers).toFixed(2)),
    relativeVelocityKmS: parseFloat(parseFloat(approach.relative_velocity.kilometers_per_second).toFixed(2)),
  };
}

function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultEndDate(startDate: string): string {
  const start = new Date(startDate);
  start.setDate(start.getDate() + 7);
  return start.toISOString().split('T')[0];
}

export async function getNeoFeed(params: {
  start_date?: string;
  end_date?: string;
  min_diameter_km?: number;
  max_diameter_km?: number;
  hazardous_only?: boolean;
}): Promise<NeoResult> {
  const {
    start_date,
    end_date,
    min_diameter_km,
    max_diameter_km,
    hazardous_only,
  } = params;

  const effectiveStartDate = start_date || getTodayUTC();
  const effectiveEndDate = end_date || getDefaultEndDate(effectiveStartDate);

  const cacheKey = buildCacheKey('neo', `start=${effectiveStartDate}`, `end=${effectiveEndDate}`);
  const { value: raw, cached } = await cacheWrap<NasaNeoFeedResponse>(
    cacheKey,
    env.CACHE_TTL_NEO,
    () => fetchNeoFeed({ start_date: effectiveStartDate, end_date: effectiveEndDate })
  );

  // Flatten and normalize
  let entries: NeoEntry[] = [];
  for (const dateKey of Object.keys(raw.near_earth_objects)) {
    const objects = raw.near_earth_objects[dateKey];
    for (const obj of objects) {
      const normalized = normalizeNeoObject(obj);
      if (normalized) entries.push(normalized);
    }
  }

  const elementCount = entries.length;

  // Apply filters
  if (min_diameter_km !== undefined) {
    entries = entries.filter((e) => e.estimatedDiameterKm.max >= min_diameter_km);
  }
  if (max_diameter_km !== undefined) {
    entries = entries.filter((e) => e.estimatedDiameterKm.min <= max_diameter_km);
  }
  if (hazardous_only) {
    entries = entries.filter((e) => e.isPotentiallyHazardous);
  }

  // Sort by closeApproachDate ascending
  entries.sort((a, b) => a.closeApproachDate.localeCompare(b.closeApproachDate));

  return {
    data: entries,
    meta: {
      count: entries.length,
      elementCount,
      cached,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      source: 'nasa_neo_v1',
    },
  };
}
