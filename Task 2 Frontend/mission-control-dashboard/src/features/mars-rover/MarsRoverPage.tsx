import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoverFilters } from './RoverFilters';
import { RoverPhotoGrid } from './RoverPhotoGrid';
import { useMarsPhotosInfinite } from './useMarsPhotosInfinite';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { ApiError } from '@/api/types';
import { z } from 'zod';

const marsFilterSchema = z.object({
  rover: z.string().default('curiosity'),
  mode: z.enum(['sol', 'date']).default('sol'),
  sol: z.coerce.number().min(0).default(0),
  date: z.string().optional(),
  camera: z.string().optional(),
});

type MarsFilters = z.infer<typeof marsFilterSchema>;

export function MarsRoverPage() {
  const [searchParams] = useSearchParams();

  const filters = useMemo<MarsFilters>(() => {
    const result = marsFilterSchema.safeParse({
      rover: searchParams.get('rover'),
      mode: searchParams.get('mode'),
      sol: searchParams.get('sol'),
      date: searchParams.get('date'),
      camera: searchParams.get('camera'),
    });
    return result.success ? result.data : { rover: 'curiosity', mode: 'sol', sol: 0, camera: undefined, date: undefined };
  }, [searchParams]);

  const {
    data: photos,
    isLoading,
    error,
    refetch,
  } = useMarsPhotosInfinite({
    rover: filters.rover,
    sol: filters.mode === 'sol' ? filters.sol : undefined,
    earthDate: filters.mode === 'date' ? filters.date : undefined,
    camera: filters.camera,
  });

  const handleFilterChange = useCallback((_newFilters: MarsFilters) => {
    // Filters are automatically handled via URL params
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Mars Rover Photos
        </h1>
        <RoverFilters onFilterChange={handleFilterChange} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[var(--color-bg-secondary)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Mars Rover Photos
        </h1>
        <RoverFilters onFilterChange={handleFilterChange} />
        <ErrorState error={error as unknown as ApiError} onRetry={() => refetch()} />
      </div>
    );
  }

  const photoList = photos || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
        Mars Rover Photos
      </h1>
      <RoverFilters onFilterChange={handleFilterChange} />

      {photoList.length === 0 ? (
        <EmptyState
          title="No Photos Found"
          message="No photos found for this combination of filters. Try adjusting your search criteria."
        />
      ) : (
        <>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {photoList.length} photos
          </p>
          <RoverPhotoGrid
            photos={photoList}
            isLoadingMore={false}
            hasNextPage={false}
            loadMore={() => {}}
          />
        </>
      )}
    </div>
  );
}
