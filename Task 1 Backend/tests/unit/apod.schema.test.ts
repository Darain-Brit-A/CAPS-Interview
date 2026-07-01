import { apodQuerySchema } from '../../src/modules/apod/apod.schema';

describe('APOD Schema Validation', () => {
  it('should accept valid date query', () => {
    const result = apodQuerySchema.safeParse({ date: '2026-06-30' });
    expect(result.success).toBe(true);
  });

  it('should accept valid range query', () => {
    const result = apodQuerySchema.safeParse({
      start_date: '2026-06-01',
      end_date: '2026-06-07',
    });
    expect(result.success).toBe(true);
  });

  it('should reject both date and start_date', () => {
    const result = apodQuerySchema.safeParse({
      date: '2026-06-30',
      start_date: '2026-06-01',
    });
    expect(result.success).toBe(false);
  });

  it('should reject future date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split('T')[0];
    const result = apodQuerySchema.safeParse({ date: dateStr });
    expect(result.success).toBe(false);
  });

  it('should reject date before 1995-06-16', () => {
    const result = apodQuerySchema.safeParse({ date: '1990-01-01' });
    expect(result.success).toBe(false);
  });

  it('should reject start_date after end_date', () => {
    const result = apodQuerySchema.safeParse({
      start_date: '2026-06-07',
      end_date: '2026-06-01',
    });
    expect(result.success).toBe(false);
  });

  it('should accept empty query', () => {
    const result = apodQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
