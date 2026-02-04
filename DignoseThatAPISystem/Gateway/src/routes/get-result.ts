import { Hono } from 'hono';
import { createSupabaseClient } from '../utils/supabase';
import type { Env } from '../index';

export const getResultRoute = new Hono<{ Bindings: Env }>();

getResultRoute.get('/', async (c) => {
  const apiKey = c.get('apiKey');
  const supabase = createSupabaseClient(c.env);

  const jobId = c.req.query('job_id');

  if (!jobId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'MISSING_JOB_ID',
          message: 'job_id is required',
        },
      },
      400
    );
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .select(
      'id, status, radiograph_type, result_json, result_path, inference_version, error_message, created_at, completed_at'
    )
    .eq('company_id', apiKey.companyId)
    .eq('id', jobId)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error || !job) {
    return c.json(
      {
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      },
      404
    );
  }

  // Log API request (synchronous with error handling)
  const { error: logError } = await supabase.from('api_logs').insert({
    company_id: apiKey.companyId,
    api_key_id: apiKey.id,
    job_id: job.id,
    status_code: 200,
    is_billable: false,
  });

  if (logError) {
    console.error('Failed to create API log:', logError);
  }

  // Build response based on status
  const response: Record<string, unknown> = {
    job_id: job.id,
    status: job.status,
  };

  if (job.status === 'completed') {
    response.radiograph_type = job.radiograph_type;
    response.inference_version = job.inference_version;
    
    // Read result from storage if available, fallback to result_json for old jobs
    if (job.result_path) {
      const { data: resultData, error: storageError } = await supabase
        .storage
        .from('results')
        .download(job.result_path as string);
      
      if (!storageError && resultData) {
        const resultText = await resultData.text();
        response.result = JSON.parse(resultText);
      }
    } else if (job.result_json) {
      response.result = job.result_json;
    }
  } else if (job.status === 'failed') {
    response.error_message = job.error_message;
  }

  return c.json({
    success: true,
    data: response,
  });
});
