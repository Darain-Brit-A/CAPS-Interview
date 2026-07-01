import type { MarsPhoto, MarsPhotosResponse, RoverInfo } from './types';
import { apiFetch } from './client';

export const marsKeys = {
  all: ['mars'] as const,
  photos: (rover: string, sol?: number, earthDate?: string, camera?: string) =>
    [...marsKeys.all, 'photos', rover, sol, earthDate, camera].filter(Boolean) as unknown as readonly [string, string, ...unknown[]],
  roverInfo: (rover: string) => [...marsKeys.all, 'rover', rover] as const,
};

export async function fetchRoverInfo(rover: string): Promise<RoverInfo> {
  return apiFetch<RoverInfo>(`/mars-photos/api/v1/rovers/${rover}`);
}

export async function fetchMarsPhotos(
  rover: string,
  options: {
    sol?: number;
    earthDate?: string;
    camera?: string;
    page: number;
  }
): Promise<MarsPhotosResponse> {
  const params: Record<string, string | number> = {
    page: options.page,
  };

  if (options.sol !== undefined) {
    params.sol = options.sol;
  } else if (options.earthDate) {
    params.earth_date = options.earthDate;
  }

  if (options.camera) {
    params.camera = options.camera;
  }

  return apiFetch<MarsPhotosResponse>(
    `/mars-photos/api/v1/rovers/${rover}/photos`,
    params
  );
}

// Deduplicate photos by ID (NASA API occasionally returns overlapping results)
export function deduplicatePhotos(photos: MarsPhoto[]): MarsPhoto[] {
  const seen = new Set<number>();
  return photos.filter((photo) => {
    if (seen.has(photo.id)) {
      return false;
    }
    seen.add(photo.id);
    return true;
  });
}
