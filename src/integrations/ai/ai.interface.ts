export interface ScrapAnalysisItem {
  id: string;
  category: string;
  subType: string;
  weightKg: number;
  pricePerKg: number;
  estimatedTotal: number;
  confidenceScore: number;
  notes: string;
  imageUrl?: string;
  storagePath?: string;
}

export interface ScrapAnalysisResult {
  items: ScrapAnalysisItem[];
  warnings?: string[];
  rawProviderResponse?: unknown;
  imageUrl?: string;
  storagePath?: string;
}

export interface AiProvider {
  analyzeScrapImage(imageDataOrPath: string): Promise<ScrapAnalysisResult>;
}
