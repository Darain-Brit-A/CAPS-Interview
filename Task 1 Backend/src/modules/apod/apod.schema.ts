import { z } from 'zod';

const APOD_MIN_DATE = '1995-06-16';

export const apodQuerySchema = z
  .object({
    date: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.date && (data.start_date || data.end_date)) return false;
      return true;
    },
    { message: 'Cannot supply both date and start_date/end_date' }
  )
  .refine(
    (data) => {
      if (data.date) {
        const d = new Date(data.date);
        if (isNaN(d.getTime())) return false;
      }
      return true;
    },
    { message: 'Invalid date format' }
  )
  .refine(
    (data) => {
      if (data.date) {
        const d = new Date(data.date);
        const today = new Date();
        today.setUTCHours(23, 59, 59, 999);
        if (d > today) return false;
      }
      return true;
    },
    { message: 'Date cannot be in the future' }
  )
  .refine(
    (data) => {
      if (data.date) {
        if (data.date < APOD_MIN_DATE) return false;
      }
      return true;
    },
    { message: `Date cannot be earlier than ${APOD_MIN_DATE}` }
  )
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        if (data.start_date > data.end_date) return false;
      }
      return true;
    },
    { message: 'start_date must be before end_date' }
  );

export const apodNormalizedSchema = z.object({
  date: z.string(),
  title: z.string(),
  explanation: z.string(),
  mediaType: z.enum(['image', 'video']),
  url: z.string(),
  hdurl: z.string().nullable(),
  copyright: z.string().nullable(),
});
