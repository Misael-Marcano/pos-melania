import { Response } from 'express';
import { AppError } from '../middlewares/error.middleware';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200
) => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  data: unknown = null,
) => {
  return res.status(statusCode).json({ success: false, message, data });
};

/** Respuesta de error desde `catch`: respeta `AppError.statusCode`. */
export function sendFail(
  res: Response,
  err: unknown,
  opts?: { defaultStatus?: number; defaultMessage?: string },
) {
  const defaultStatus = opts?.defaultStatus ?? 400;
  const defaultMessage = opts?.defaultMessage ?? 'Error';
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }
  const msg = err instanceof Error ? err.message : defaultMessage;
  return sendError(res, msg, defaultStatus);
}

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};
