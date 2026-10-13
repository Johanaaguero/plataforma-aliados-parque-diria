import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        ok: false,
        code: 'FILE_TOO_LARGE',
        message: 'Cada archivo puede tener un tamaño máximo de 5 MB.',
      });
    }

    return res.status(400).json({
      ok: false,
      code: error.code,
      message: error.message,
    });
  }

  if (error instanceof Error && error.message.startsWith('Solo se permiten')) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_FILE_TYPE',
      message: error.message,
    });
  }

  console.error('Error interno del servidor:', error);

  res.status(500).json({
    ok: false,
    message: 'Error interno del servidor',
  });
};
