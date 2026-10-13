import type { Metadata } from 'next'
import './globals.css'
import './editorial-refresh.css'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: {
    default: 'Bliss Media — Stories. Perspectives. Culture.',
    template: '%s — Bliss Media',
  },
  description:
    'Stories. Perspectives. Culture. Independent perspectives on technology, entertainment, lifestyle, business and the world around us.',
  applicationName: 'Bliss Media',
  openGraph: {
    type: 'website',
    siteName: 'Bliss Media',
    title: 'Bliss Media — Stories. Perspectives. Culture.',
    description:
      'Independent perspectives on technology, entertainment, lifestyle, business and the world around us.',
  },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
