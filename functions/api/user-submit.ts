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
 
     const body = await context.request.json() as { radiograph_id: string };
     const { radiograph_id } = body;
 
     if (!radiograph_id) {
       return new Response(
         JSON.stringify({ error: 'radiograph_id is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Get radiograph record
     const { data: radiograph, error: radiographError } = await supabase
       .from('radiographs')
       .select('*, patients(patient_ref, dentist_id)')
       .eq('id', radiograph_id)
       .single();
 
     if (radiographError || !radiograph) {
       console.error('Radiograph not found:', radiographError);
       return new Response(
         JSON.stringify({ error: 'Radiograph not found' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Radiograph found:', radiograph.id);
 
     // Get user profile for doctor_ref
     let { data: profile, error: profileError } = await supabase
       .from('profiles')
       .select('doctor_ref')
       .eq('user_id', user.id)
       .single();
 
     // Profile yoksa otomatik oluştur
     if (profileError || !profile) {
       console.log('Profile not found, creating one for user:', user.id);
       
       const { data: newProfile, error: createError } = await supabase
         .from('profiles')
         .insert({
           user_id: user.id,
           first_name: user.user_metadata?.first_name || '',
           last_name: user.user_metadata?.last_name || '',
         })
         .select('doctor_ref')
         .single();
 
       if (createError || !newProfile) {
         console.error('Failed to create profile:', createError);
         return new Response(
           JSON.stringify({ error: 'Failed to create user profile' }),
           { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
       
       profile = newProfile;
     }
 
     console.log('Doctor ref:', profile.doctor_ref);
 
     // Download image from storage
     const { data: fileData, error: downloadError } = await supabase.storage
       .from('radiographs')
       .download(radiograph.storage_path);
 
     if (downloadError || !fileData) {
       console.error('Failed to download image:', downloadError);
       return new Response(
         JSON.stringify({ error: 'Failed to download radiograph image' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Convert to Uint8Array and detect MIME type
     const arrayBuffer = await fileData.arrayBuffer();
     const uint8Array = new Uint8Array(arrayBuffer);
     
     let mimeType = 'image/jpeg';
     if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
       mimeType = 'image/jpeg';
     } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
       mimeType = 'image/png';
     } else if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
       mimeType = 'image/webp';
     }
 
     const imageBlob = new Blob([uint8Array], { type: mimeType });
     console.log('Image blob created, size:', imageBlob.size, 'type:', mimeType);
 
     // Submit to Gateway API
     const formData = new FormData();
     formData.append('image', imageBlob, 'radiograph.jpg');
     formData.append('doctor_ref', profile.doctor_ref || 'UnknownDoctor');
     formData.append('clinic_ref', 'DiagnoseThat');
     formData.append('patient_ref', (radiograph as any).patients?.patient_ref || 'UnknownPatient');
     formData.append('radiograph_type', radiograph.radiograph_type || 'panoramic');
 
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
         JSON.stringify({ error: 'Failed to submit analysis to Gateway', details: errorText }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const submitResult = await response.json() as Record<string, unknown>;
     console.log('Gateway API raw response:', JSON.stringify(submitResult));
 
     // Normalize job_id extraction
     const data = submitResult.data as Record<string, unknown> | undefined;
     const jobId = submitResult.job_id || submitResult.jobId || submitResult.id || 
                   data?.job_id || data?.jobId || data?.id ||
                   submitResult.task_id || submitResult.request_id;
     
     console.log('Extracted job_id:', jobId);
 
     if (!jobId) {
       console.error('No job_id found in Gateway response');
       return new Response(
         JSON.stringify({ error: 'No job_id received from analysis service', gateway_response: submitResult }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Update radiograph with job_id
     const { error: updateError } = await supabase
       .from('radiographs')
       .update({
         job_id: jobId as string,
         analysis_status: 'processing',
         updated_at: new Date().toISOString()
       })
       .eq('id', radiograph_id);
 
     if (updateError) {
       console.error('Failed to update radiograph:', updateError);
     }
 
     return new Response(
       JSON.stringify({ job_id: jobId, status: 'processing' }),
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