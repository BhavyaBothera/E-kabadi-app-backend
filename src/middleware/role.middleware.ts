import { Request, Response, NextFunction } from 'express';
import { AppRole } from '../config/constants';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export const requireRole = (...allowedRoles: AppRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied: Required role (${allowedRoles.join(' or ')}), current role (${req.user.role})`,
        ),
      );
    }

    next();
  };
};
