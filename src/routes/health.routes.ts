import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiResponse } from '../utils/api-response';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const isMock = env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test';

  const healthData = {
    status: 'ok',
    database: isMock ? 'in_memory_mock_ready' : 'connected',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };

  ApiResponse.success(res, healthData, 'E-Kabadi Backend Health OK');
});

export default router;
