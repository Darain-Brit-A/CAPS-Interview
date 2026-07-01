import { cacheWrap, buildCacheKey } from '../../cache/cacheService';
import { env } from '../../config/env';
import { fetchMarsRoverPhotos } from '../../integrations/nasa/marsRoverClient';
import { NasaMarsRoverPhoto } from '../../integrations/nasa/types';

export interface MarsRoverPhotoEntry {
  id: number;
  sol: number;
  earthDate: string;
  camera: { code: string; fullName: string };
  rover: { name: string; status: string };
  imgSrc: string;
}

export interface MarsRoverResult {
  data: MarsRoverPhotoEntry[];
  meta: {
    count: number;
    page: number;
    cached: boolean;
    source: string;
  };
}

function normalizePhoto(raw: NasaMarsRoverPhoto): MarsRoverPhotoEntry {
  return {
    id: raw.id,
    sol: raw.sol,
    earthDate: raw.earth_date,
    camera: {
      code: raw.camera.name,
      fullName: raw.camera.full_name,
    },
    rover: {
      name: raw.rover.name.toLowerCase(),
      status: raw.rover.status,
    },
    imgSrc: raw.img_src,
  };
}

export async function getMarsRoverPhotos(params: {
  rover: string;
  sol?: number;
  earth_date?: string;
  camera?: string;
  page?: number;
}): Promise<MarsRoverResult> {
  const { rover, sol, earth_date, camera, page = 1 } = params;

  const cacheKey = buildCacheKey(
    'mars-rover',
    `rover=${rover.toLowerCase()}`,
    sol !== undefined ? `sol=${sol}` : `earth_date=${earth_date}`,
    camera ? `camera=${camera.toUpperCase()}` : '',
    `page=${page}`
  );

  const { value: raw, cached } = await cacheWrap(
    cacheKey,
    env.CACHE_TTL_MARS_ROVER,
    () =>
      fetchMarsRoverPhotos({
        rover: rover.toLowerCase(),
        sol,
        earth_date,
        camera: camera?.toUpperCase(),
        page,
      })
  );

  const entries = raw.photos.map(normalizePhoto);

  return {
    data: entries,
    meta: {
      count: entries.length,
      page,
      cached,
      source: 'nasa_mars_rover_v1',
    },
  };
}
