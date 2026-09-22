import { z } from 'zod';
import { APP_CONSTANTS } from '../config/constants';

export const pickupItemInputSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subType: z.string().min(1, 'Sub-type is required'),
  weightKg: z.number().positive('Weight must be greater than 0'),
  pricePerKg: z.number().min(0, 'Price cannot be negative'),
  estimatedTotal: z.number().min(0).optional(),
  confidenceScore: z.number().optional().default(0.95),
  notes: z.string().optional().default(''),
});

export const createPickupSchema = z.object({
  items: z.array(pickupItemInputSchema).min(1, 'At least one scrap item is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  address: z.string().min(5, 'Address is required'),
  instructions: z.string().optional().default(''),
  latitude: z.number().optional().default(28.6139),
  longitude: z.number().optional().default(77.2090),
  autoAssign: z.boolean().optional().default(true),
  collectorId: z.string().optional(),
});

export const updatePickupStatusSchema = z.object({
  status: z.enum(APP_CONSTANTS.PICKUP_STATUSES),
  notes: z.string().optional(),
});

export const verifyPickupSchema = z.object({
  otpCode: z.string().min(4).max(6, 'Valid 4-6 digit OTP required'),
  finalWeight: z.number().positive('Final verified weight must be > 0'),
  finalAmount: z.number().min(0, 'Final verified amount cannot be negative'),
});

export const cancelPickupSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required'),
});

export type CreatePickupInput = z.infer<typeof createPickupSchema>;
export type UpdatePickupStatusInput = z.infer<typeof updatePickupStatusSchema>;
export type VerifyPickupInput = z.infer<typeof verifyPickupSchema>;
export type CancelPickupInput = z.infer<typeof cancelPickupSchema>;
