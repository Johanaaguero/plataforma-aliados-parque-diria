import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('Error interno del servidor:', error);

  res.status(500).json({
    ok: false,
    message: 'Error interno del servidor',
  });
};