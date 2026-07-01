import { useQuery } from '@tanstack/react-query';
import { fetchApodByDate, fetchApodRange, apodKeys } from '@/api/apod';

export function useApodByDate(date: string) {
  return useQuery({
    queryKey: apodKeys.byDate(date),
    queryFn: () => fetchApodByDate(date),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useApodRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: apodKeys.byRange(startDate, endDate),
    queryFn: () => fetchApodRange(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}
