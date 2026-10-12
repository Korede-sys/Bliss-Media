'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database'
import { getSupabaseConfig, isSupabaseConfigured } from './config'

let browserClient: SupabaseClient<Database> | undefined
export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null
  if (!browserClient) {
    const { url, key } = getSupabaseConfig()
    browserClient = createBrowserClient<Database>(url, key)
  }
  return browserClient
}
