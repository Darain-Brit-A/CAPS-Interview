import { Request, Response, NextFunction } from 'express';
import { getNeoFeed } from './neo.service';

export async function neoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as Record<string, unknown>;
    const result = await getNeoFeed({
      start_date: q.start_date as string | undefined,
      end_date: q.end_date as string | undefined,
      min_diameter_km: q.min_diameter_km as number | undefined,
      max_diameter_km: q.max_diameter_km as number | undefined,
      hazardous_only: q.hazardous_only as boolean | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
