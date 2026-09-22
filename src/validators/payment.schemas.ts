import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  pickupId: z.string().min(1, 'Pickup ID is required'),
});

export const verifyPaymentSchema = z.object({
  pickupId: z.string().min(1, 'Pickup ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().optional(),
  method: z.string().optional().default('UPI / GPay Direct'),
  idempotencyKey: z.string().optional(),
});

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
