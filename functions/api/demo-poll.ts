interface Env {
  GATEWAY_API_KEY: string;
  GATEWAY_API_URL: string;
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
 
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const corsHeaders = getCorsHeaders(context.request);
    try {
     const url = new URL(context.request.url);
     const jobId = url.searchParams.get('job_id');
 
     if (!jobId) {
       return new Response(
         JSON.stringify({ error: 'job_id is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Polling for job:', jobId);
 
     // Call Gateway API
     const gatewayUrl = context.env.GATEWAY_API_URL || 'https://api.diagnosethat.net';
     const response = await fetch(`${gatewayUrl}/v1/get-result?job_id=${jobId}`, {
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
     console.log('Gateway poll raw response:', JSON.stringify(pollResult));
 
     // Normalize: extract status/result/error from either top-level or nested data
     const data = pollResult.data as Record<string, unknown> | undefined;
     const status = pollResult.status ?? data?.status;
     const result = pollResult.result ?? data?.result;
     const error = pollResult.error ?? data?.error;
 
     console.log('Poll result - status:', status, 'hasResult:', !!result);
 
     return new Response(
       JSON.stringify({ status, result, error }),
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