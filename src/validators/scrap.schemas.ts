import { z } from 'zod';

export const analyzeScrapSchema = z.object({
  image: z.string().min(1, 'Image path or base64 string is required'),
  isFromCamera: z.boolean().default(false),
});

export const updateRateSchema = z.object({
  currentRate: z.number().min(0, 'Rate cannot be negative'),
  minRate: z.number().min(0).optional(),
  maxRate: z.number().min(0).optional(),
});

export type AnalyzeScrapInput = z.infer<typeof analyzeScrapSchema>;
export type UpdateRateInput = z.infer<typeof updateRateSchema>;
