import Link from 'next/link'
import { Suspense } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { SignInForm } from './SignInForm'

export const metadata = { title: 'Staff sign in' }
export default function SignInPage() { return <main className="admin-shell"><section className="admin-panel"><Link className="wordmark" href="/">bliss<span>.</span></Link><span className="eyebrow">EDITORIAL OFFICE</span><h1>Welcome <em>back.</em></h1><p>Sign in to continue to your Bliss editorial workspace.</p><Suspense fallback={<p>Loading sign-in…</p>}><SignInForm configured={isSupabaseConfigured()}/></Suspense><Link className="admin-back" href="/">← Back to the journal</Link></section></main> }
