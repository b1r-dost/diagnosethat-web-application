import { Hono } from 'hono';
import { createSupabaseClient } from '../utils/supabase';
import type { Env } from '../index';

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get('/', async (c) => {
  const supabase = createSupabaseClient(c.env);

  // Check database connection
  const { error: dbError } = await supabase
    .from('companies')
    .select('id')
    .limit(1);

  // Check storage connection
  const { error: storageError } = await supabase.storage
    .from('radiographs')
    .list('', { limit: 1 });

  const isHealthy = !dbError && !storageError;

  return c.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbError ? 'error' : 'ok',
        storage: storageError ? 'error' : 'ok',
      },
    },
    isHealthy ? 200 : 503
  );
});
