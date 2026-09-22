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
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const parsedItems = JSON.parse(text) as Array<{
        category: string;
        subType: string;
        estimatedWeightKg?: number;
        confidenceScore?: number;
        notes?: string;
      }>;

      const items = parsedItems.map((item, idx) => ({
        id: `AI-GEM-${idx + 1}`,
        category: item.category || 'General Scrap',
        subType: item.subType || 'Mixed Recyclables',
        weightKg: item.estimatedWeightKg || 1.0,
        pricePerKg: 30.0,
        estimatedTotal: (item.estimatedWeightKg || 1.0) * 30.0,
        confidenceScore: item.confidenceScore || 0.88,
        notes: item.notes || 'Detected by Gemini Vision',
      }));

      return {
        items,
        warnings: [],
        rawProviderResponse: json,
      };
    } catch (error) {
      logger.error('Gemini vision analysis failed, falling back to basic result', { error });
      throw error;
    }
  }
}
