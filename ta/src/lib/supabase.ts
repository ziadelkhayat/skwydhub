import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://akrezmxgtorkuwxxctyk.supabase.co";
export const SUPABASE_KEY = "sb_publishable_tL62keD2HdovsMpI8XAkWg_TPdjaUVh";   // public key, safe in the browser
// same storage key as the current portal, so one sign-in works in both while the rebuild is in progress
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
