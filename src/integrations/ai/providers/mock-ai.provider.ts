import { AiProvider, ScrapAnalysisResult } from '../ai.interface';

export class MockAiProvider implements AiProvider {
  async analyzeScrapImage(_imageDataOrPath: string): Promise<ScrapAnalysisResult> {
    // Simulate slight analysis delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      items: [
        {
          id: 'AI-101',
          category: 'Plastic',
          subType: 'PET Bottles & Containers',
          weightKg: 1.4,
          pricePerKg: 50.0,
          estimatedTotal: 70.0,
          confidenceScore: 0.94,
          notes: 'Clean transparent plastic bottles detected.',
        },
        {
          id: 'AI-102',
          category: 'Paper & Cardboard',
          subType: 'Corrugated Boxes',
          weightKg: 3.2,
          pricePerKg: 15.0,
          estimatedTotal: 48.0,
          confidenceScore: 0.91,
          notes: 'Dry cardboard packaging boxes detected.',
        },
      ],
      warnings: [],
      rawProviderResponse: { mock: true, timestamp: new Date().toISOString() },
    };
  }
}
