import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service';
import { ApiResponse } from '../utils/api-response';
import { BadRequestError } from '../utils/errors';

export class StorageController {
  async getImageUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storagePath = req.query.path as string;
      if (!storagePath || storagePath.trim().length === 0) {
        throw new BadRequestError('Query parameter "path" is required');
      }

      const signedUrl = await storageService.getSignedUrl(storagePath);
      ApiResponse.success(res, { signedUrl, storagePath }, 'Signed URL generated successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { image } = req.body;
      if (!image || typeof image !== 'string') {
        throw new BadRequestError('Body parameter "image" (base64 string) is required');
      }

      const userId = req.user?.id || 'anonymous';
      const result = await storageService.uploadScrapImage(image, userId);
      ApiResponse.created(res, result, 'Image uploaded to Supabase Storage');
    } catch (error) {
      next(error);
    }
  }
}

export const storageController = new StorageController();
