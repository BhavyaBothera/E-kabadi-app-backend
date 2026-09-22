import { z } from 'zod';

export const redeemCouponSchema = z.object({
  catalogId: z.string().min(1, 'Catalog item ID is required'),
});

export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
