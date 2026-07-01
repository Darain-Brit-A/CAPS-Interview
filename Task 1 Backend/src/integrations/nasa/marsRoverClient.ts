import { getNasaHttpClient } from './nasaHttpClient';
import { NasaMarsRoverResponse } from './types';

export interface MarsRoverQueryParams {
  rover: string;
  sol?: number;
  earth_date?: string;
  camera?: string;
  page?: number;
}

export async function fetchMarsRoverPhotos(params: MarsRoverQueryParams): Promise<NasaMarsRoverResponse> {
  const client = getNasaHttpClient();
  const { rover, ...queryParams } = params;
  const response = await client.get<NasaMarsRoverResponse>(
    `/mars-photos/api/v1/rovers/${rover.toLowerCase()}/photos`,
    { params: queryParams }
  );
  return response.data;
}
