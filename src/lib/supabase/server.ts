import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database'
import { getSupabaseConfig, isSupabaseConfigured } from './config'

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null
  const { url, key } = getSupabaseConfig()
  const cookieStore = await cookies()
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
        catch { /* Server Components cannot write cookies; middleware refreshes sessions. */ }
      },
    },
  })
}
