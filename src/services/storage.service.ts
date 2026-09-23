import { supabaseAdmin } from '../config/supabase';
import { isMockStore } from '../config/env';
import { logger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';

export interface StorageUploadResult {
  storagePath: string;
  signedUrl: string;
}

export class StorageService {
  private readonly bucketName = 'scrap-images';

  async ensureBucket(): Promise<void> {
    if (isMockStore()) {
      logger.info(`[StorageService] Mock store active — skipping bucket check for '${this.bucketName}'`);
      return;
    }

    try {
      const { data: bucket, error } = await supabaseAdmin.storage.getBucket(this.bucketName);
      if (error || !bucket) {
        logger.info(`[StorageService] Bucket '${this.bucketName}' not found, attempting creation...`);
        const { error: createError } = await supabaseAdmin.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });

        if (createError && !createError.message.toLowerCase().includes('already exists')) {
          logger.warn(`[StorageService] Could not auto-create '${this.bucketName}':`, createError);
        } else {
          logger.info(`[StorageService] Storage bucket '${this.bucketName}' created/verified successfully`);
        }
      } else {
        logger.info(`[StorageService] Storage bucket '${this.bucketName}' verified`);
      }
    } catch (err) {
      logger.warn(`[StorageService] Exception during ensureBucket:`, err);
    }
  }

  async uploadScrapImage(
    imageDataOrBase64: string,
    userId: string = 'anonymous',
  ): Promise<StorageUploadResult> {
    let cleanBase64 = imageDataOrBase64;
    let mimeType = 'image/jpeg';

    const match = imageDataOrBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      cleanBase64 = match[2];
    }

    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `${userId}/${filename}`;

    if (isMockStore()) {
      return {
        storagePath,
        signedUrl: `https://storage.mock-project.supabase.co/${this.bucketName}/${storagePath}`,
      };
    }

    try {
      const buffer = Buffer.from(cleanBase64, 'base64');
      const { error: uploadError } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        logger.error('[StorageService] Supabase upload failed:', uploadError);
        throw new BadRequestError(`Image upload failed: ${uploadError.message}`);
      }

      const { data: signedData, error: signError } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(storagePath, 3600); // 1 hour valid

      if (signError) {
        logger.warn('[StorageService] createSignedUrl failed:', signError);
      }

      return {
        storagePath,
        signedUrl: signedData?.signedUrl || '',
      };
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      logger.error('[StorageService] Error during image upload:', err);
      throw new BadRequestError(`Failed to process and store image: ${err?.message || err}`);
    }
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (isMockStore()) {
      return `https://storage.mock-project.supabase.co/${this.bucketName}/${storagePath}`;
    }

    const { data, error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      logger.error('[StorageService] createSignedUrl failed:', error);
      throw new BadRequestError(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async deleteImage(storagePath: string): Promise<void> {
    if (isMockStore()) return;

    const { error } = await supabaseAdmin.storage.from(this.bucketName).remove([storagePath]);
    if (error) {
      logger.warn('[StorageService] deleteImage failed:', error);
    }
  }
}

export const storageService = new StorageService();
