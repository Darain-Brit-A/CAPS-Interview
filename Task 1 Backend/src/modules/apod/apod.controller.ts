import { Request, Response, NextFunction } from 'express';
import { getApod } from './apod.service';

export async function apodController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, start_date, end_date } = req.query as {
      date?: string;
      start_date?: string;
      end_date?: string;
    };
    const result = await getApod({ date, start_date, end_date });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
