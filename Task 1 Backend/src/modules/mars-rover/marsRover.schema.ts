import { z } from 'zod';

const ROVER_CAMERAS: Record<string, string[]> = {
  curiosity: ['FHAZ', 'RHAZ', 'MAST', 'CHEMCAM', 'MAHLI', 'MARDI', 'NAVCAM'],
  opportunity: ['FHAZ', 'RHAZ', 'NAVCAM', 'PANCAM', 'MINITES'],
  spirit: ['FHAZ', 'RHAZ', 'NAVCAM', 'PANCAM', 'MINITES'],
  perseverance: [
    'EDL_RUCAM', 'EDL_RDCAM', 'EDL_DDCAM', 'EDL_PUCAM1', 'EDL_PUCAM2',
    'NAVCAM_LEFT', 'NAVCAM_RIGHT', 'MCZ_RIGHT', 'MCZ_LEFT',
    'FRONT_HAZCAM_LEFT_A', 'FRONT_HAZCAM_RIGHT_A',
    'REAR_HAZCAM_LEFT', 'REAR_HAZCAM_RIGHT',
    'SKYCAM', 'SHERLOC_WATSON',
  ],
};

const validRovers = Object.keys(ROVER_CAMERAS);

export const marsRoverQuerySchema = z
  .object({
    rover: z.string().transform((v) => v.toLowerCase()),
    sol: z.coerce.number().int().min(0).optional(),
    earth_date: z.string().optional(),
    camera: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .refine(
    (data) => validRovers.includes(data.rover),
    { message: `Invalid rover. Valid rovers: ${validRovers.join(', ')}` }
  )
  .refine(
    (data) => {
      if (data.sol !== undefined && data.earth_date !== undefined) return false;
      return true;
    },
    { message: 'Cannot supply both sol and earth_date' }
  )
  .refine(
    (data) => {
      if (data.sol === undefined && !data.earth_date) return false;
      return true;
    },
    { message: 'Either sol or earth_date is required' }
  )
  .refine(
    (data) => {
      if (data.earth_date) {
        const d = new Date(data.earth_date);
        if (isNaN(d.getTime())) return false;
        const today = new Date();
        today.setUTCHours(23, 59, 59, 999);
        if (d > today) return false;
      }
      return true;
    },
    { message: 'earth_date cannot be in the future' }
  )
  .refine(
    (data) => {
      if (data.camera && data.rover) {
        const cameras = ROVER_CAMERAS[data.rover];
        if (cameras && !cameras.includes(data.camera.toUpperCase())) return false;
      }
      return true;
    },
    (data) => ({
      message: `Invalid camera for ${data.rover}. Valid cameras: ${ROVER_CAMERAS[data.rover]?.join(', ')}`,
    })
  );
