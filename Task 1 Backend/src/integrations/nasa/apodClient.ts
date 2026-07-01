import { getNasaHttpClient } from './nasaHttpClient';
import { NasaApodResponse } from './types';

export async function fetchApodByDate(date: string): Promise<NasaApodResponse> {
  const client = getNasaHttpClient();
  const response = await client.get<NasaApodResponse>('/planetary/apod', {
    params: { date },
  });
  return response.data;
}

export async function fetchApodByRange(start_date: string, end_date: string): Promise<NasaApodResponse[]> {
  const client = getNasaHttpClient();
  const response = await client.get<NasaApodResponse[]>('/planetary/apod', {
    params: { start_date, end_date },
  });
  return response.data;
}
