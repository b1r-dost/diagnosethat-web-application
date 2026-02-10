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
 
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const corsHeaders = getCorsHeaders(context.request);
    try {
     const body = await context.request.json() as {
       image_base64: string;
       clinic_ref?: string;
       radiograph_type?: string;
     };
 
     const { image_base64, clinic_ref, radiograph_type } = body;
 
     if (!image_base64) {
       return new Response(
         JSON.stringify({ error: 'image_base64 is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Submitting demo analysis for clinic:', clinic_ref);
 
     // Detect image type from base64 header
     let mimeType = 'image/jpeg';
     if (image_base64.startsWith('/9j/')) {
       mimeType = 'image/jpeg';
     } else if (image_base64.startsWith('iVBORw')) {
       mimeType = 'image/png';
     } else if (image_base64.startsWith('UklGR')) {
       mimeType = 'image/webp';
     }
 
     // Convert base64 to binary
     const binaryString = atob(image_base64);
     const bytes = new Uint8Array(binaryString.length);
     for (let i = 0; i < binaryString.length; i++) {
       bytes[i] = binaryString.charCodeAt(i);
     }
     const imageBlob = new Blob([bytes], { type: mimeType });
 
     console.log('Image blob created, size:', imageBlob.size, 'type:', mimeType);
 
     // Prepare form data for Gateway API
     const formData = new FormData();
     formData.append('image', imageBlob, 'radiograph.jpg');
     formData.append('doctor_ref', 'MainPageDemo');
     formData.append('clinic_ref', clinic_ref || 'DiagnoseThat');
     formData.append('patient_ref', 'DemoPatient');
     formData.append('radiograph_type', radiograph_type || 'panoramic');
 
     // Call Gateway API
     const gatewayUrl = context.env.GATEWAY_API_URL || 'https://api.diagnosethat.net';
     const response = await fetch(`${gatewayUrl}/v1/submit-analysis`, {
       method: 'POST',
       headers: { 'X-API-Key': context.env.GATEWAY_API_KEY },
       body: formData,
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error('Gateway API error:', errorText);
       return new Response(
         JSON.stringify({ error: 'Failed to submit analysis', details: errorText }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const result = await response.json() as Record<string, unknown>;
     console.log('Gateway API raw response:', JSON.stringify(result));
 
     // Normalize: extract job_id from either top-level or nested data
     const data = result.data as Record<string, unknown> | undefined;
     const jobId = result.job_id ?? data?.job_id;
     const status = result.status ?? data?.status ?? 'pending';
 
     if (!jobId) {
       console.error('No job_id found in Gateway response:', JSON.stringify(result));
       return new Response(
         JSON.stringify({ error: 'No job_id received from Gateway', raw: result }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Analysis submitted, job_id:', jobId);
 
     return new Response(
       JSON.stringify({ job_id: jobId, status }),
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