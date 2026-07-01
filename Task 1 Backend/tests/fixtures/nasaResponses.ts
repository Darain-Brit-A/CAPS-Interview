export const mockApodSingle = {
  date: '2026-06-30',
  title: 'Test APOD Title',
  explanation: 'This is a test APOD explanation.',
  media_type: 'image',
  url: 'https://example.com/image.jpg',
  hdurl: 'https://example.com/image_hd.jpg',
  copyright: 'Test Copyright',
};

export const mockApodVideo = {
  date: '2026-06-29',
  title: 'Test APOD Video',
  explanation: 'This is a test video APOD.',
  media_type: 'video',
  url: 'https://example.com/video.mp4',
  copyright: 'Video Copyright',
};

export const mockApodRange = [
  mockApodSingle,
  {
    date: '2026-06-29',
    title: 'Second APOD',
    explanation: 'Another test APOD.',
    media_type: 'image',
    url: 'https://example.com/image2.jpg',
    hdurl: 'https://example.com/image2_hd.jpg',
    copyright: null,
  },
];

export const mockMarsRoverPhotos = {
  photos: [
    {
      id: 102693,
      sol: 1000,
      img_src: 'https://example.com/photo.jpg',
      earth_date: '2015-05-30',
      rover: {
        id: 5,
        name: 'Curiosity',
        status: 'active',
      },
      camera: {
        id: 20,
        name: 'FHAZ',
        rover_id: 5,
        full_name: 'Front Hazard Avoidance Camera',
      },
    },
  ],
};

export const mockMarsRoverEmpty = {
  photos: [],
};

export const mockNeoFeed = {
  element_count: 2,
  near_earth_objects: {
    '2026-07-01': [
      {
        id: '3542519',
        name: '(2026 Test Object)',
        estimated_diameter: {
          kilometers: {
            estimated_diameter_min: 0.12,
            estimated_diameter_max: 0.27,
          },
        },
        is_potentially_hazardous_asteroid: true,
        close_approach_data: [
          {
            close_approach_date: '2026-07-01',
            miss_distance: { kilometers: '123456.7' },
            relative_velocity: { kilometers_per_second: '12.3' },
          },
        ],
      },
      {
        id: '3542520',
        name: '(2026 Safe Object)',
        estimated_diameter: {
          kilometers: {
            estimated_diameter_min: 0.01,
            estimated_diameter_max: 0.02,
          },
        },
        is_potentially_hazardous_asteroid: false,
        close_approach_data: [
          {
            close_approach_date: '2026-07-02',
            miss_distance: { kilometers: '999999.9' },
            relative_velocity: { kilometers_per_second: '5.0' },
          },
        ],
      },
    ],
  },
};
