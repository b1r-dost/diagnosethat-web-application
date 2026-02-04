import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { healthRoute } from './routes/health';
import { submitAnalysisRoute } from './routes/submit-analysis';
import { getResultRoute } from './routes/get-result';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  INFERENCE_QUEUE: Queue;  // Cloudflare Queue binding
}

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', cors());
app.use('*', logger());

// Health check (no auth required)
app.route('/health', healthRoute);

// API v1 routes (auth required)
const v1 = new Hono<{ Bindings: Env }>();
v1.use('*', authMiddleware);
v1.route('/submit-analysis', submitAnalysisRoute);
v1.route('/get-result', getResultRoute);

app.route('/v1', v1);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  );
});

export default app;
