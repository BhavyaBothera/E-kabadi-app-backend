import { z } from 'zod';

export const updateCitizenProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  profilePhoto: z.string().optional(),
});

export const createAddressSchema = z.object({
  title: z.string().default('Home'),
  addressLine: z.string().min(5, 'Address line is required'),
  sector: z.string().optional(),
  city: z.string().default('Noida'),
  state: z.string().default('Uttar Pradesh'),
  pincode: z.string().default('201301'),
  latitude: z.number().default(28.6139),
  longitude: z.number().default(77.2090),
  isDefault: z.boolean().default(false),
});

export type UpdateCitizenProfileInput = z.infer<typeof updateCitizenProfileSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
