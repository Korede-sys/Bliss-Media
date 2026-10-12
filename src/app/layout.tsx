import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
export const metadata:Metadata={title:{default:'Bliss Media — A magazine for what matters',template:'%s — Bliss Media'},description:'Independent stories for curious lives. Explore technology, culture, business, lifestyle and the ideas shaping tomorrow.'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><SiteHeader/><main id="main">{children}</main><SiteFooter/></body></html>}
