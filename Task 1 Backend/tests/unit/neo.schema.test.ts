import { neoQuerySchema } from '../../src/modules/neo/neo.schema';

describe('NEO Schema Validation', () => {
  it('should accept valid query with dates within 7 days', () => {
    const result = neoQuerySchema.safeParse({
      start_date: '2026-07-01',
      end_date: '2026-07-05',
    });
    expect(result.success).toBe(true);
  });

  it('should reject range exceeding 7 days', () => {
    const result = neoQuerySchema.safeParse({
      start_date: '2026-07-01',
      end_date: '2026-07-10',
    });
    expect(result.success).toBe(false);
  });

  it('should reject start_date after end_date', () => {
    const result = neoQuerySchema.safeParse({
      start_date: '2026-07-05',
      end_date: '2026-07-01',
    });
    expect(result.success).toBe(false);
  });

  it('should accept empty query', () => {
    const result = neoQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept hazardous_only as boolean string', () => {
    const result = neoQuerySchema.safeParse({
      start_date: '2026-07-01',
      hazardous_only: 'true',
    });
    expect(result.success).toBe(true);
  });

  it('should accept diameter filters', () => {
    const result = neoQuerySchema.safeParse({
      min_diameter_km: 0.1,
      max_diameter_km: 1.0,
    });
    expect(result.success).toBe(true);
  });

  it('should allow future dates for NEO', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];
    const result = neoQuerySchema.safeParse({
      start_date: dateStr,
    });
    expect(result.success).toBe(true);
  });
});
