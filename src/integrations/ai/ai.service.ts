import { AiProvider, ScrapAnalysisResult } from './ai.interface';
import { MockAiProvider } from './providers/mock-ai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { env, isMockStore } from '../../config/env';
import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';

import { storageService, StorageUploadResult } from '../../services/storage.service';

export class AiService {
  private provider: AiProvider;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
      logger.info('Using GeminiProvider for AI Scrap Identification');
      this.provider = new GeminiProvider(env.GEMINI_API_KEY);
    } else {
      logger.info('Using MockAiProvider for AI Scrap Identification (No GEMINI_API_KEY found)');
      this.provider = new MockAiProvider();
    }
  }

  async analyzeScrapImage(imageData: string, userId?: string, isFromCamera = false): Promise<ScrapAnalysisResult> {
    // 1. Upload scrap image to Supabase Storage
    let storageResult: StorageUploadResult | undefined;
    if (imageData && (imageData.startsWith('data:image') || imageData.length > 100)) {
      try {
        storageResult = await storageService.uploadScrapImage(imageData, userId || 'anonymous');
        logger.info(`[AiService] Image uploaded to Supabase Storage: ${storageResult.storagePath}`);
      } catch (uploadErr) {
        logger.warn('[AiService] Supabase Storage upload warning:', uploadErr);
      }
    }

    // 2. Perform AI vision scrap material detection
    const rawResult = await this.provider.analyzeScrapImage(imageData);

    // 3. Enrich items with live authoritative rates from rate_cards
    let rates: Array<{ sub_type: string; current_rate: string }> = [];
    if (!isMockStore()) {
      const { data } = await supabaseAdmin
        .from('rate_cards')
        .select('sub_type, current_rate')
        .eq('is_active', true);
      rates = data || [];
    }

    const enrichedItems = rawResult.items.map((item) => {
      const matchingRate = rates?.find(
        (r) => r.sub_type.toLowerCase() === item.subType.toLowerCase() ||
               item.subType.toLowerCase().includes(r.sub_type.toLowerCase()),
      );

      const authoritativePrice = matchingRate ? parseFloat(matchingRate.current_rate) : item.pricePerKg;
      return {
        ...item,
        pricePerKg: authoritativePrice,
        estimatedTotal: Math.round(item.weightKg * authoritativePrice * 100) / 100,
      };
    });

    // 4. Save analysis record in database if userId is provided (storing storage reference)
    if (userId) {
      try {
        await supabaseAdmin.from('scrap_analyses').insert({
          user_id: userId,
          image_url: storageResult?.storagePath || null, // Store storage reference in PostgreSQL
          is_from_camera: isFromCamera,
          detected_items: enrichedItems,
          raw_provider_response: rawResult.rawProviderResponse,
          confidence_average:
            enrichedItems.reduce((sum, it) => sum + it.confidenceScore, 0) / (enrichedItems.length || 1),
        });
      } catch (err) {
        logger.warn('Failed to persist scrap_analysis record:', err);
      }
    }

    return {
      items: enrichedItems,
      warnings: rawResult.warnings,
      imageUrl: storageResult?.signedUrl,
      storagePath: storageResult?.storagePath,
    };
  }
}

export const aiService = new AiService();
