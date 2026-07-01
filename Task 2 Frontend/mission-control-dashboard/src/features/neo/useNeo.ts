import { useQuery } from '@tanstack/react-query';
import { fetchNeoFeed, neoKeys } from '@/api/neo';

export function useNeo(startDate: string, endDate: string) {
  return useQuery({
    queryKey: neoKeys.feed(startDate, endDate),
    queryFn: () => fetchNeoFeed(startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes for NEO (near real-time data)
  });
}
