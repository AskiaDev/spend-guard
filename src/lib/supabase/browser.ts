"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "@/config/env";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const config = requireSupabaseConfig();

  return createBrowserClient<Database>(config.url, config.publishableKey);
}
