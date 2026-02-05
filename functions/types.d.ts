 /// <reference types="@cloudflare/workers-types" />
 
 interface Env {
   GATEWAY_API_KEY: string;
   GATEWAY_API_URL: string;
   SUPABASE_URL: string;
   SUPABASE_SERVICE_ROLE_KEY: string;
 }
 
 type PagesFunction<E = unknown> = (context: EventContext<E, string, Record<string, unknown>>) => Response | Promise<Response>;