import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next()
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !request.nextUrl.pathname.endsWith('/sign-in')) {
    const signIn = request.nextUrl.clone()
    signIn.pathname = '/admin/sign-in'
    signIn.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(signIn)
  }
  return response
}

export const config = { matcher: ['/admin/:path*'] }
