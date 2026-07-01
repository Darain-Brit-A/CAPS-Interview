import { marsRoverQuerySchema } from '../../src/modules/mars-rover/marsRover.schema';

describe('Mars Rover Schema Validation', () => {
  it('should accept valid rover + sol query', () => {
    const result = marsRoverQuerySchema.safeParse({ rover: 'curiosity', sol: 1000 });
    expect(result.success).toBe(true);
  });

  it('should accept valid rover + earth_date query', () => {
    const result = marsRoverQuerySchema.safeParse({
      rover: 'Curiosity',
      earth_date: '2015-05-30',
    });
    expect(result.success).toBe(true);
  });

  it('should normalize rover name to lowercase', () => {
    const result = marsRoverQuerySchema.safeParse({ rover: 'CURIOSITY', sol: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rover).toBe('curiosity');
    }
  });

  it('should reject both sol and earth_date', () => {
    const result = marsRoverQuerySchema.safeParse({
      rover: 'curiosity',
      sol: 1000,
      earth_date: '2015-05-30',
    });
    expect(result.success).toBe(false);
  });

  it('should reject when neither sol nor earth_date provided', () => {
    const result = marsRoverQuerySchema.safeParse({ rover: 'curiosity' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid rover name', () => {
    const result = marsRoverQuerySchema.safeParse({ rover: 'invalid_rover', sol: 100 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid camera for rover', () => {
    const result = marsRoverQuerySchema.safeParse({
      rover: 'curiosity',
      sol: 100,
      camera: 'INVALID_CAMERA',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid camera for rover', () => {
    const result = marsRoverQuerySchema.safeParse({
      rover: 'curiosity',
      sol: 100,
      camera: 'FHAZ',
    });
    expect(result.success).toBe(true);
  });

  it('should accept page parameter', () => {
    const result = marsRoverQuerySchema.safeParse({
      rover: 'curiosity',
      sol: 100,
      page: 2,
    });
    expect(result.success).toBe(true);
  });

  it('should reject future earth_date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split('T')[0];
    const result = marsRoverQuerySchema.safeParse({
      rover: 'curiosity',
      earth_date: dateStr,
    });
    expect(result.success).toBe(false);
  });
});
