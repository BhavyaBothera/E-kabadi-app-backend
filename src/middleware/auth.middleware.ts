import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedSupabaseClient, supabaseAdmin } from '../config/supabase';
import { UnauthorizedError } from '../utils/errors';
import { AppRole } from '../config/constants';
import { logger } from '../utils/logger';
import { isMockStore } from '../config/env';

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: AppRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      supabase?: SupabaseClient;
      token?: string;
    }
  }
}

// In-memory demo/test user store for zero-credential local development and automated testing
export const MOCK_USERS: Record<string, AuthenticatedUser> = {
  'mock-citizen-token': {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'Aarav Sharma',
    phone: '+919876512345',
    email: 'aarav.sharma@example.com',
    role: 'citizen',
  },
  'mock-collector-token': {
    id: '22222222-2222-4222-a222-222222222222',
    name: 'Ramesh Kumar',
    phone: '+919876543210',
    email: 'ramesh.kumar@example.com',
    role: 'collector',
  },
  'mock-admin-token': {
    id: '99999999-9999-4999-a999-999999999999',
    name: 'System Admin',
    phone: '+919800011223',
    email: 'admin@ekabadi.com',
    role: 'admin',
  },
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    req.token = token;

    // 1. Check for mock/demo tokens ONLY in mock/test mode
    if (isMockStore() && MOCK_USERS[token]) {
      req.user = MOCK_USERS[token];
      req.supabase = getAuthenticatedSupabaseClient(token);
      return next();
    }

    // 2. Real Supabase Auth Token verification
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      logger.warn(`Failed token verification: ${error?.message}`);
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const authUser = data.user;

    // 3. Resolve role and profile from database (NEVER trust frontend claims)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authUser.id)
      .single();

    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('name, phone')
      .eq('id', authUser.id)
      .single();

    const role: AppRole = (roleData?.role as AppRole) || (authUser.user_metadata?.role as AppRole) || 'citizen';

    req.user = {
      id: authUser.id,
      email: authUser.email || '',
      phone: profileData?.phone || authUser.phone,
      name: profileData?.name || authUser.user_metadata?.name || 'User',
      role,
    };

    // User-scoped Supabase client that honors Row-Level Security
    req.supabase = getAuthenticatedSupabaseClient(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return requireAuth(req, res, next);
};
