import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey?.startsWith("sb_publishable_")) {
  throw new Error(
    "Укажите VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local.",
  );
}

export const supabase = createClient<Database>(url, publishableKey);
