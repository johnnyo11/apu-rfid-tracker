import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export { isSupabaseConfigured };

export const supabase = isSupabaseConfigured
  ? createClient()
  : null;
