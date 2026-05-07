import { APP_CONFIG } from "./config.js";

const supabaseFactory = window.supabase;

if (!supabaseFactory || !APP_CONFIG.supabaseUrl || !APP_CONFIG.supabaseAnonKey) {
  console.warn("DueScope Supabase runtime config is missing or the Supabase client CDN did not load.");
}

export const supabase = supabaseFactory && APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey
  ? supabaseFactory.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
      db: { schema: APP_CONFIG.schema },
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    })
  : null;

export function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured for this preview.");
  }
  return supabase;
}

export async function getAccessToken() {
  const client = ensureSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session?.access_token || "";
}
