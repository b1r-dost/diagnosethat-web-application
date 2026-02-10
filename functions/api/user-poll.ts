import { createClient } from '@supabase/supabase-js';

interface Env {
  GATEWAY_API_KEY: string;
  GATEWAY_API_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const ALLOWED_ORIGINS = [
  'https://diagnosethat.net',
  'https://www.diagnosethat.net',
  'https://taniyorum.net',
  'https://www.taniyorum.net',
  'https://diagnosethat.pages.dev',
  'https://id-preview--8885573f-0277-4eeb-bfdf-9e7c3ab28184.lovable.app',
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export const onRequestOptions: PagesFunction = async (context) => {
  return new Response(null, { headers: getCorsHeaders(context.request) });
};
 
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const corsHeaders = getCorsHeaders(context.request);
    try {
     // Get authorization header
     const authHeader = context.request.headers.get('Authorization');
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: 'No authorization header' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Create Supabase client with service role to verify user
     const supabaseUrl = context.env.SUPABASE_URL || 'https://bllvnenslgntvkvgwgqh.supabase.co';
     const supabase = createClient(supabaseUrl, context.env.SUPABASE_SERVICE_ROLE_KEY);
     
     // Verify user token
     const token = authHeader.replace('Bearer ', '');
     const { data: { user }, error: authError } = await supabase.auth.getUser(token);
     
     if (authError || !user) {
       console.error('Auth error:', authError);
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('User authenticated:', user.id);
 
     const body = await context.request.json() as { job_id: string };
     const { job_id } = body;
 
     if (!job_id) {
       return new Response(
         JSON.stringify({ error: 'job_id is required for polling' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Polling for job:', job_id);
 
     // Poll Gateway API
     const gatewayUrl = context.env.GATEWAY_API_URL || 'https://api.diagnosethat.net';
     const response = await fetch(`${gatewayUrl}/v1/get-result?job_id=${job_id}`, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
         'X-API-Key': context.env.GATEWAY_API_KEY,
       },
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error('Gateway API poll error:', errorText);
       return new Response(
         JSON.stringify({ error: 'Failed to poll analysis', details: errorText }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const pollResult = await response.json() as Record<string, unknown>;
     
     // Normalize response
     const data = pollResult.data as Record<string, unknown> | undefined;
     const status = pollResult.status ?? data?.status;
     const result = pollResult.result ?? data?.result;
     const errorMessage = pollResult.error_message ?? data?.error_message;
     const radiographType = pollResult.radiograph_type ?? data?.radiograph_type;
     
     console.log('Poll result - status:', status, 'hasResult:', !!result);
 
     // Update database if completed or failed
     if (status === 'completed' || status === 'error' || status === 'failed') {
       const updateData: Record<string, unknown> = {
         analysis_status: status === 'completed' ? 'completed' : 'failed',
         updated_at: new Date().toISOString()
       };
 
       if (status === 'completed' && result) {
         updateData.analysis_result = result;
       }
       
       if (radiographType) {
         updateData.radiograph_type = radiographType;
       }
 
       const { error: updateError } = await supabase
         .from('radiographs')
         .update(updateData)
         .eq('job_id', job_id);
 
       if (updateError) {
         console.error('Failed to update radiograph result:', updateError);
       }
     }
 
     return new Response(
       JSON.stringify({ status, result, error_message: errorMessage, radiograph_type: radiographType }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('Function error:', errorMessage);
     return new Response(
       JSON.stringify({ error: 'Internal server error', message: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 };