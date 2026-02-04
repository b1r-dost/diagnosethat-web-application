import { Context, Next } from 'hono';
import { createSupabaseClient } from '../utils/supabase';

export interface ApiKeyInfo {
  id: string;
  companyId: string;
  rateLimit: number | null;
  isActive: boolean;
}

declare module 'hono' {
  interface ContextVariableMap {
    apiKey: ApiKeyInfo;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const apiKeyHeader = c.req.header('X-API-Key');

  if (!apiKeyHeader) {
    return c.json(
      {
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'X-API-Key header is required',
        },
      },
      401
    );
  }

  // Calculate hash first (client-side, fast)
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKeyHeader);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const supabase = createSupabaseClient(c.env);

  // Direct lookup by hash (uses UNIQUE INDEX on key_hash)
  const { data: apiKeyRecord, error } = await supabase
    .from('api_keys')
    .select('id, company_id, rate_limit, is_active')
    .eq('key_hash', keyHash)
    .single();

  if (error || !apiKeyRecord) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
      },
      401
    );
  }

  if (!apiKeyRecord.is_active) {
    return c.json(
      {
        success: false,
        error: {
          code: 'API_KEY_INACTIVE',
          message: 'API key is inactive',
        },
      },
      401
    );
  }

  // Set API key info in context
  c.set('apiKey', {
    id: apiKeyRecord.id,
    companyId: apiKeyRecord.company_id,
    rateLimit: apiKeyRecord.rate_limit,
    isActive: apiKeyRecord.is_active,
  });

  // NOTE: last_used_at update removed to reduce write amplification
  // It can be derived from api_logs when needed

  await next();
}
