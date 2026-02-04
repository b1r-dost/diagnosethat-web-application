import { Hono } from 'hono';
import { parseMultipartRequest } from '@mjackson/multipart-parser';
import { createSupabaseClient } from '../utils/supabase';
import type { Env } from '../index';

export const submitAnalysisRoute = new Hono<{ Bindings: Env }>();

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

submitAnalysisRoute.post('/', async (c) => {
  const apiKey = c.get('apiKey');
  const supabase = createSupabaseClient(c.env);

  let imageBytes: Uint8Array | null = null;
  let imageType: string | null = null;
  let imageName: string | null = null;

  // Optional metadata
  let patientRef: string | null = null;
  let doctorRef: string | null = null;
  let clinicRef: string | null = null;

  try {
    // Validate content type
    const contentType = c.req.header('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type must be multipart/form-data',
          },
        },
        400
      );
    }

    // Use parseMultipartRequest - handles boundary extraction and streaming automatically
    for await (const part of parseMultipartRequest(c.req.raw)) {
      if (part.name === 'image') {
        // Use arrayBuffer() to get binary data, then convert to Uint8Array
        imageBytes = new Uint8Array(await part.arrayBuffer());
        imageType = part.mediaType || 'application/octet-stream';
        imageName = part.filename || 'image.jpg';
      } else if (part.name === 'patient_ref') {
        patientRef = (await part.text()).trim();
      } else if (part.name === 'doctor_ref') {
        doctorRef = (await part.text()).trim();
      } else if (part.name === 'clinic_ref') {
        clinicRef = (await part.text()).trim();
      }
      // Ignore request_id if sent (backward compatibility)
    }

    // Validate required fields
    if (!imageBytes) {
      return c.json(
        {
          success: false,
          error: {
            code: 'MISSING_IMAGE',
            message: 'image is required',
          },
        },
        400
      );
    }

    // Validate image size
    if (imageBytes.byteLength > MAX_IMAGE_SIZE) {
      return c.json(
        {
          success: false,
          error: {
            code: 'IMAGE_TOO_LARGE',
            message: `Image size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
          },
        },
        413
      );
    }

    // Validate image type
    if (!ALLOWED_TYPES.includes(imageType!)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_IMAGE_TYPE',
            message: `Image type must be one of: ${ALLOWED_TYPES.join(', ')}`,
          },
        },
        400
      );
    }

    // Generate storage path with random UUID
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const extension = imageName!.split('.').pop() || 'jpg';
    const storagePath = `${apiKey.companyId}/${timestamp}-${randomId}.${extension}`;

    // Upload image to storage (only for new jobs)
    const { error: uploadError } = await supabase.storage
      .from('radiographs')
      .upload(storagePath, imageBytes, {
        contentType: imageType!,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return c.json(
        {
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload image',
          },
        },
        500
      );
    }

    // Calculate expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: apiKey.companyId,
        api_key_id: apiKey.id,
        image_path: storagePath,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select('id, status, created_at')
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      // Clean up the uploaded file
      await supabase.storage.from('radiographs').remove([storagePath]);
      
      return c.json(
        {
          success: false,
          error: {
            code: 'JOB_CREATION_FAILED',
            message: 'Failed to create analysis job',
          },
        },
        500
      );
    }

    // Send job to Cloudflare Queue (non-blocking)
    // Use contentType: "text" to send raw JSON string without v8/MessagePack wrapper
    c.executionCtx.waitUntil(
      c.env.INFERENCE_QUEUE.send(
        JSON.stringify({
          job_id: job.id,
          company_id: apiKey.companyId,
          image_path: storagePath,
        }),
        { contentType: "text" }
      ).catch((err) => {
        console.error('Failed to send job to queue:', err);
      })
    );

    // Log API request (synchronous with error handling)
    const { error: logError } = await supabase.from('api_logs').insert({
      company_id: apiKey.companyId,
      api_key_id: apiKey.id,
      job_id: job.id,
      patient_ref: patientRef,
      doctor_ref: doctorRef,
      clinic_ref: clinicRef,
      status_code: 200,
      is_billable: true,
    });

    if (logError) {
      console.error('Failed to create API log:', logError);
      // Log error doesn't block job creation, just log it
    }

    return c.json({
      success: true,
      data: {
        job_id: job.id,
        status: job.status,
        created_at: job.created_at,
      },
    });
  } catch (error) {
    // Check for MultipartParseError
    if (error instanceof Error && error.name === 'MultipartParseError') {
      console.error('Multipart parse error:', error.message);
      return c.json(
        {
          success: false,
          error: {
            code: 'MULTIPART_PARSE_ERROR',
            message: 'Failed to parse multipart form data',
          },
        },
        400
      );
    }

    console.error('Submit analysis error:', error);
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
  }
});
