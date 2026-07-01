import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useNeo } from './useNeo';
import { NeoFilters } from './NeoFilters';
import { NeoList } from './NeoList';
import { NeoItemSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { ApiError } from '@/api/types';
import type { NeoObject } from '@/api/types';

const neoFilterSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  minKm: z.coerce.number().min(0).optional(),
  maxKm: z.coerce.number().min(0).optional(),
  hazardousOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((val) => val === 'true'),
});

type NeoFiltersState = z.infer<typeof neoFilterSchema>;

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function NeoPage() {
  const [searchParams] = useSearchParams();
  const defaultRange = getDefaultDateRange();

  const filters = useMemo<NeoFiltersState>(() => {
    const result = neoFilterSchema.safeParse({
      start: searchParams.get('start'),
      end: searchParams.get('end'),
      minKm: searchParams.get('minKm'),
      maxKm: searchParams.get('maxKm'),
      hazardousOnly: searchParams.get('hazardousOnly'),
    });
    return result.success
      ? { ...result.data, hazardousOnly: result.data.hazardousOnly ?? false }
      : { start: defaultRange.start, end: defaultRange.end, hazardousOnly: false };
  }, [searchParams, defaultRange]);

  const startDate = filters.start || defaultRange.start;
  const endDate = filters.end || defaultRange.end;

  const { data: allObjects, isLoading, error, refetch } = useNeo(startDate, endDate);

  // Apply client-side filters
  const filteredObjects = useMemo(() => {
    if (!allObjects) return [];

    return allObjects.filter((obj: NeoObject) => {
      // Size filter (client-side)
      const maxSize = obj.estimated_diameter.kilometers.estimated_diameter_max;
      if (filters.minKm !== undefined && maxSize < filters.minKm) {
        return false;
      }
      if (filters.maxKm !== undefined && maxSize > filters.maxKm) {
        return false;
      }

      // Hazardous filter
      if (filters.hazardousOnly && !obj.is_potentially_hazardous_asteroid) {
        return false;
      }

      return true;
    });
  }, [allObjects, filters]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Near Earth Objects
        </h1>
        <NeoFilters />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <NeoItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Near Earth Objects
        </h1>
        <NeoFilters />
        <ErrorState error={error as unknown as ApiError} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
        Near Earth Objects
      </h1>
      <NeoFilters />

      {filteredObjects.length === 0 ? (
        <EmptyState
          title="No Asteroids Found"
          message="No near-Earth objects found for this date range and filters."
        />
      ) : (
        <>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {filteredObjects.length} asteroids
          </p>
          <NeoList objects={filteredObjects} />
        </>
      )}
    </div>
  );
}
