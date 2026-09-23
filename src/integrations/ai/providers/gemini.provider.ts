import { AiProvider, ScrapAnalysisResult } from '../ai.interface';
import { logger } from '../../../utils/logger';

export class GeminiProvider implements AiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeScrapImage(imageDataOrBase64: string): Promise<ScrapAnalysisResult> {
    logger.info('Analyzing scrap image using Gemini Vision API');

    try {
      const prompt = `Analyze this image for recyclable scrap materials (Plastic, Paper & Cardboard, Metal & Aluminium, E-Waste, Electronics, Appliances).
Return ONLY a valid JSON array of objects with the following schema:
[
  {
    "category": "Plastic",
    "subType": "PET Bottles",
    "estimatedWeightKg": 1.5,
    "confidenceScore": 0.95,
    "notes": "Description of items found"
  }
]`;

      const cleanBase64 = imageDataOrBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
            },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        logger.error(`Gemini API HTTP ${response.status}: ${errText}`);
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      let parsedItems: Array<{
        category?: string;
        subType?: string;
        estimatedWeightKg?: number;
        confidenceScore?: number;
        notes?: string;
      }> = [];

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          parsedItems = parsed;
        } else if (parsed && Array.isArray(parsed.items)) {
          parsedItems = parsed.items;
        } else if (parsed && typeof parsed === 'object') {
          parsedItems = [parsed];
        }
      } catch (parseErr) {
        logger.error('Failed to parse Gemini JSON output:', { text, parseErr });
        throw new Error('Gemini API returned an unparseable response structure');
      }

      const items = parsedItems.map((item, idx) => ({
        id: `AI-GEM-${idx + 1}`,
        category: item.category || 'General Scrap',
        subType: item.subType || 'Mixed Recyclables',
        weightKg: Math.max(0.1, Number(item.estimatedWeightKg) || 1.0),
        pricePerKg: 30.0,
        estimatedTotal: (Math.max(0.1, Number(item.estimatedWeightKg) || 1.0)) * 30.0,
        confidenceScore: Math.min(1.0, Math.max(0.1, Number(item.confidenceScore) || 0.85)),
        notes: item.notes || 'Detected by Gemini Vision',
      }));

      return {
        items,
        warnings: items.length === 0 ? ['No recyclable materials clearly recognized in image'] : [],
        rawProviderResponse: json,
      };
    } catch (error: any) {
      logger.error('Gemini vision analysis failed:', error);
      throw error;
    }
  }
}
