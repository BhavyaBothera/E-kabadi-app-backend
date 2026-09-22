import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ApiResponse } from '../utils/api-response';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  logger.error(`Error processing request: ${err.message}`, {
    stack: err.stack,
    requestId: req.id,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Handle unexpected errors safely
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  ApiResponse.error(res, message, 500, 'INTERNAL_SERVER_ERROR');
};
