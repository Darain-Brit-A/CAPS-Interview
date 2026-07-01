import { z } from 'zod';

export const neoQuerySchema = z
  .object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    min_diameter_km: z.coerce.number().min(0).optional(),
    max_diameter_km: z.coerce.number().min(0).optional(),
    hazardous_only: z
      .string()
      .transform((v) => v === 'true')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      }
      return true;
    },
    { message: 'NEO feed queries are limited to a 7-day range.' }
  )
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        if (data.start_date > data.end_date) return false;
      }
      return true;
    },
    { message: 'start_date must be before end_date' }
  )
  .refine(
    (data) => {
      if (data.start_date) {
        const d = new Date(data.start_date);
        if (isNaN(d.getTime())) return false;
      }
      if (data.end_date) {
        const d = new Date(data.end_date);
        if (isNaN(d.getTime())) return false;
      }
      return true;
    },
    { message: 'Invalid date format' }
  );
