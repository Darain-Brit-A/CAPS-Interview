import { Request, Response, NextFunction } from 'express';
import { getMarsRoverPhotos } from './marsRover.service';

export async function marsRoverController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as Record<string, unknown>;
    const result = await getMarsRoverPhotos({
      rover: q.rover as string,
      sol: q.sol as number | undefined,
      earth_date: q.earth_date as string | undefined,
      camera: q.camera as string | undefined,
      page: (q.page as number) || 1,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
