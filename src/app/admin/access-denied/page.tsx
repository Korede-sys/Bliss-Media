import Link from 'next/link'
export const metadata = { title: 'Access unavailable' }
export default function AccessDenied() { return <main className="admin-shell"><section className="admin-panel"><span className="eyebrow">EDITORIAL OFFICE</span><h1>Access <em>unavailable.</em></h1><p>Your signed-in account does not have an editorial profile. Contact a Bliss administrator to request an invitation or role assignment.</p><Link className="text-link" href="/">Return to the journal →</Link></section></main> }
