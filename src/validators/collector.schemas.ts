import { z } from 'zod';

export const updateCollectorStatusSchema = z.object({
  isAvailable: z.boolean().optional(),
  status: z.enum(['Active', 'Offline', 'Suspended']).optional(),
});

export const updateCollectorLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const nearbyCollectorsQuerySchema = z.object({
  latitude: z.string().optional().transform((v) => (v ? parseFloat(v) : 28.6139)),
  longitude: z.string().optional().transform((v) => (v ? parseFloat(v) : 77.2090)),
  radiusKm: z.string().optional().transform((v) => (v ? parseFloat(v) : 10)),
});

export type UpdateCollectorStatusInput = z.infer<typeof updateCollectorStatusSchema>;
export type UpdateCollectorLocationInput = z.infer<typeof updateCollectorLocationSchema>;
export type NearbyCollectorsQueryInput = z.infer<typeof nearbyCollectorsQuerySchema>;
