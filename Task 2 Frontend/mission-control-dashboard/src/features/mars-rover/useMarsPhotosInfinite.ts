import { useQuery } from '@tanstack/react-query';
import { fetchMarsPhotos, fetchRoverInfo, marsKeys, deduplicatePhotos } from '@/api/marsPhotos';

interface UseMarsPhotosOptions {
  rover: string;
  sol?: number;
  earthDate?: string;
  camera?: string;
}

export function useRoverInfo(rover: string) {
  return useQuery({
    queryKey: marsKeys.roverInfo(rover),
    queryFn: () => fetchRoverInfo(rover),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarsPhotosInfinite({
  rover,
  sol,
  earthDate,
  camera,
}: UseMarsPhotosOptions) {
  return useQuery({
    queryKey: marsKeys.photos(rover, sol, earthDate, camera),
    queryFn: async () => {
      const allPhotos = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetchMarsPhotos(rover, { sol, earthDate, camera, page });
        const photos = deduplicatePhotos(response.photos);
        allPhotos.push(...photos);

        if (photos.length < 25) {
          hasMore = false;
        } else {
          page++;
        }
      }

      return allPhotos;
    },
    staleTime: 5 * 60 * 1000,
  });
}
