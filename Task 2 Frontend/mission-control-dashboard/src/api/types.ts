// APOD types
export interface ApodResponse {
  date: string;
  explanation: string;
  hdurl?: string;
  url: string;
  media_type: 'image' | 'video';
  title: string;
  copyright?: string;
  thumbnail_url?: string;
  service_version?: string;
}

// Mars Rover types
export interface RoverCamera {
  name: string;
  full_name: string;
}

export interface RoverInfo {
  id: number;
  name: string;
  landing_date: string;
  launch_date: string;
  status: string;
  max_sol: number;
  max_date: string;
  total_photos: number;
  cameras: RoverCamera[];
}

export interface MarsPhoto {
  id: number;
  sol: number;
  camera: RoverCamera;
  img_src: string;
  earth_date: string;
  rover: {
    name: string;
    status: string;
  };
}

export interface MarsPhotosResponse {
  photos: MarsPhoto[];
}

// NEO types
export interface NeoObject {
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
    relative_velocity: {
      kilometers_per_hour: string;
    };
    miss_distance: {
      kilometers: string;
    };
  }>;
}

export interface NeoFeedResponse {
  element_count: number;
  near_earth_objects: {
    [date: string]: NeoObject[];
  };
}

// API Error types
export interface ApiError {
  status: number;
  message: string;
  code: 'RATE_LIMITED' | 'NETWORK_ERROR' | 'API_ERROR' | 'UNKNOWN';
}

// Rover cameras lookup table
export const ROVER_CAMERAS: Record<string, string[]> = {
  curiosity: ['FHAZ', 'RHAZ', 'MAST', 'CHEMCAM', 'MAHLI', 'MARDI', 'NAVCAM'],
  opportunity: ['FHAZ', 'RHAZ', 'NAVCAM', 'PANCAM', 'MINITES'],
  spirit: ['FHAZ', 'RHAZ', 'NAVCAM', 'PANCAM', 'MINITES'],
  perseverance: [
    'EDL_RUCAM', 'EDL_RDCAM', 'EDL_DDCAM',
    'NAVCAM_LEFT', 'NAVCAM_RIGHT',
    'MCZ_RIGHT', 'MCZ_LEFT',
    'FRONT_HAZCAM_LEFT_A', 'FRONT_HAZCAM_RIGHT_A',
    'REAR_HAZCAM_LEFT', 'REAR_HAZCAM_RIGHT',
    'SKYCAM', 'SHERLOC_WATSON'
  ],
};

export const ROVER_NAMES = ['curiosity', 'opportunity', 'perseverance', 'spirit'] as const;
export type RoverName = typeof ROVER_NAMES[number];
