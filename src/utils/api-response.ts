import { Response } from 'express';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
  ): Response<SuccessResponse<T>> {
    const requestId = (res.req as { id?: string })?.id;
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      ...(requestId && { requestId }),
    });
  }

  static created<T>(
    res: Response,
    data: T,
    message = 'Created successfully',
  ): Response<SuccessResponse<T>> {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
  ): Response<ErrorResponse> {
    const requestId = (res.req as { id?: string })?.id;
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details: details || null,
      },
      ...(requestId && { requestId }),
    });
  }
}
