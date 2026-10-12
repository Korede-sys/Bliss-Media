import Link from 'next/link'
export default function NotFound(){return <div className="empty-state not-found"><span>404</span><h1>This page wandered off.</h1><p>We couldn’t find that story. There are plenty more to discover.</p><Link className="text-link" href="/">Back to the journal →</Link></div>}
