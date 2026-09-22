export interface ScrapAnalysisItem {
  id: string;
  category: string;
  subType: string;
  weightKg: number;
  pricePerKg: number;
  estimatedTotal: number;
  confidenceScore: number;
  notes: string;
}

export interface ScrapAnalysisResult {
  items: ScrapAnalysisItem[];
  warnings?: string[];
  rawProviderResponse?: unknown;
}

export interface AiProvider {
  analyzeScrapImage(imageDataOrPath: string): Promise<ScrapAnalysisResult>;
}
