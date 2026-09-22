import { z } from 'zod';
import { APP_CONSTANTS } from '../config/constants';

// Accepts phone with or without country code and normalizes to +91XXXXXXXXXX
export const phoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(APP_CONSTANTS.USER_ROLES).default('citizen'),
  address: z.string().optional(),
});

export const loginPhoneSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
  otp: z.string().min(4).max(6, 'OTP must be 4-6 digits'),
});

export const selectRoleSchema = z.object({
  role: z.enum(APP_CONSTANTS.USER_ROLES),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginPhoneInput = z.infer<typeof loginPhoneSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SelectRoleInput = z.infer<typeof selectRoleSchema>;
