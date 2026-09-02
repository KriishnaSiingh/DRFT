import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./qr-config";

/**
 * Browser Supabase client. All access is governed by row-level security:
 * only accounts holding the `admin` role can read or write card data.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "drft-qr-auth",
  },
});
