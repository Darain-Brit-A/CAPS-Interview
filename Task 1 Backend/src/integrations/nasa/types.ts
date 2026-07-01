export interface NasaApodResponse {
  date: string;
  title: string;
  explanation: string;
  media_type: string;
  url: string;
  hdurl?: string;
  copyright?: string;
  code?: number;
  msg?: string;
}

export interface NasaMarsRoverPhoto {
  id: number;
  sol: number;
  img_src: string;
  earth_date: string;
  rover: {
    id: number;
    name: string;
    status: string;
  };
  camera: {
    id: number;
    name: string;
    rover_id: number;
    full_name: string;
  };
}

export interface NasaMarsRoverResponse {
  photos: NasaMarsRoverPhoto[];
}

export interface NasaNearEarthObject {
  id: string;
  name: string;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    miss_distance: {
      kilometers: string;
    };
    relative_velocity: {
      kilometers_per_second: string;
    };
  }>;
}

export interface NasaNeoFeedResponse {
  element_count: number;
  near_earth_objects: Record<string, NasaNearEarthObject[]>;
}
