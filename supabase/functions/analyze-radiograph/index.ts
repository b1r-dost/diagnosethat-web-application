import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Gateway API configuration
const GATEWAY_API_URL = 'https://api.diagnosethat.net';
// TEMPORARY: Hardcoded API key - will be moved to environment variable for Cloudflare Pages
const GATEWAY_API_KEY = 'dt_1714698d286ef9096ab04fa1396367466493881dff73df4ae4b91f613bb91423';

// Supabase configuration
const SUPABASE_URL = 'https://bllvnenslgntvkvgwgqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbHZuZW5zbGdudHZrdmd3Z3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTU4NjEsImV4cCI6MjA4NDMzMTg2MX0.BTJOCMBuYjLI6CUjBk1LYyz7-Nw6m6RyL9GtwJgKTjw';

interface SubmitRequest {
  radiograph_id: string;
  action: 'submit' | 'poll';
  job_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    const body: SubmitRequest = await req.json();
    const { radiograph_id, action, job_id } = body;

    if (action === 'submit') {
      // Get radiograph record
      const { data: radiograph, error: radiographError } = await supabase
        .from('radiographs')
        .select('*, patients!inner(patient_ref, dentist_id)')
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('doctor_ref')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile not found:', profileError);
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Detect MIME type from file data
      let mimeType = 'image/jpeg'; // default
      // Check for JPEG magic bytes (0xFF 0xD8 0xFF)
      if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
        mimeType = 'image/jpeg';
      }
      // Check for PNG magic bytes (0x89 0x50 0x4E 0x47)
      else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
        mimeType = 'image/png';
      }
      // Check for WebP magic bytes (RIFF....WEBP)
      else if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
        mimeType = 'image/webp';
      }

      const imageBlob = new Blob([uint8Array], { type: mimeType });
      
      console.log('Image blob created, size:', imageBlob.size, 'type:', mimeType);

      // Submit to Gateway API using multipart/form-data
      const formData = new FormData();
      formData.append('image', imageBlob, 'radiograph.jpg');
      formData.append('doctor_ref', profile.doctor_ref || 'UnknownDoctor');
      formData.append('clinic_ref', 'DiagnoseThat');
      formData.append('patient_ref', (radiograph as any).patients?.patient_ref || 'UnknownPatient');
      formData.append('radiograph_type', radiograph.radiograph_type || 'panoramic');

      const submitResponse = await fetch(`${GATEWAY_API_URL}/v1/submit-analysis`, {
        method: 'POST',
        headers: {
          'X-API-Key': GATEWAY_API_KEY,
        },
        body: formData,
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Gateway API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to submit analysis to Gateway', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const submitResult = await submitResponse.json();
      console.log('Analysis submitted, job_id:', submitResult.job_id);

      // Update radiograph with job_id
      const { error: updateError } = await supabase
        .from('radiographs')
        .update({
          job_id: submitResult.job_id,
          analysis_status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', radiograph_id);

      if (updateError) {
        console.error('Failed to update radiograph:', updateError);
      }

      return new Response(
        JSON.stringify({ job_id: submitResult.job_id, status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'poll') {
      if (!job_id) {
        return new Response(
          JSON.stringify({ error: 'job_id is required for polling' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Polling for job:', job_id);

      // Poll Gateway API
      const pollResponse = await fetch(`${GATEWAY_API_URL}/v1/get-result?job_id=${job_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': GATEWAY_API_KEY,
        },
      });

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        console.error('Gateway API poll error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to poll analysis', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pollResult = await pollResponse.json();
      console.log('Poll result status:', pollResult.status);

      // If completed or error, update the database
      if (pollResult.status === 'completed' || pollResult.status === 'error') {
        const updateData: Record<string, unknown> = {
          analysis_status: pollResult.status === 'completed' ? 'completed' : 'failed',
          updated_at: new Date().toISOString()
        };

        if (pollResult.status === 'completed' && pollResult.result) {
          updateData.analysis_result = pollResult.result;
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
        JSON.stringify(pollResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use action: "submit" or "poll"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge function error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
