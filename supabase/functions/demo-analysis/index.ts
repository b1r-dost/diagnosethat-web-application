import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Gateway API configuration
const GATEWAY_API_URL = 'https://api.diagnosethat.net';
// TEMPORARY: Hardcoded API key - will be moved to environment variable for Cloudflare Pages
const GATEWAY_API_KEY = 'dt_1714698d286ef9096ab04fa1396367466493881dff73df4ae4b91f613bb91423';

interface SubmitRequest {
  image_base64: string;
  clinic_ref: string;
  radiograph_type?: string;
}

interface PollRequest {
  job_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'POST' && action === 'submit') {
      // Submit analysis request
      const body: SubmitRequest = await req.json();
      
      if (!body.image_base64) {
        return new Response(
          JSON.stringify({ error: 'image_base64 is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Submitting demo analysis for clinic:', body.clinic_ref);

      // Call Gateway API to submit analysis
      const submitResponse = await fetch(`${GATEWAY_API_URL}/v1/submit-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': GATEWAY_API_KEY,
        },
        body: JSON.stringify({
          image_base64: body.image_base64,
          doctor_ref: 'MainPageDemo',
          clinic_ref: body.clinic_ref || 'DiagnoseThat',
          patient_ref: 'DemoPatient',
          radiograph_type: body.radiograph_type || 'panoramic',
        }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Gateway API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to submit analysis', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const submitResult = await submitResponse.json();
      console.log('Analysis submitted, job_id:', submitResult.job_id);

      return new Response(
        JSON.stringify(submitResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET' && action === 'poll') {
      // Poll for analysis result
      const jobId = url.searchParams.get('job_id');
      
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'job_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Polling for job:', jobId);

      // Call Gateway API to get result
      const pollResponse = await fetch(`${GATEWAY_API_URL}/v1/get-result?job_id=${jobId}`, {
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

      return new Response(
        JSON.stringify(pollResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use ?action=submit or ?action=poll' }),
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
