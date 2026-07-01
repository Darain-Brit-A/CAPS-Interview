import { getNasaHttpClient } from './nasaHttpClient';
import { NasaNeoFeedResponse } from './types';

export interface NeoQueryParams {
  start_date?: string;
  end_date?: string;
}

export async function fetchNeoFeed(params: NeoQueryParams): Promise<NasaNeoFeedResponse> {
  const client = getNasaHttpClient();
  const response = await client.get<NasaNeoFeedResponse>('/neo/rest/v1/feed', {
    params,
  });
  return response.data;
}
