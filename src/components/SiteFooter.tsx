import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const categories = ['Technology', 'Entertainment', 'Lifestyle', 'Business', 'News']

export function SiteFooter() {
  return (
    <footer className="site-footer" id="newsletter">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="footer-logo" href="/" aria-label="Bliss Media home">bliss<span>.</span></Link>
          <p>Stories. Perspectives. Culture.<br />An independent journal for curious minds.</p>
          <Link className="footer-explore" href="/search">Explore the journal <ArrowUpRight size={14} /></Link>
        </div>
        <div className="footer-links">
          <span className="newsletter-label">EXPLORE</span>
          {categories.map(category => (
            <Link key={category} href={`/category/${category.toLowerCase()}`}>{category}</Link>
          ))}
          <Link href="/search">All stories</Link>
        </div>
        <div className="newsletter">
          <span className="newsletter-label">A NOTE FROM BLISS</span>
          <p>For people who like to look a little closer.</p>
          <small>Our Sunday letter is coming soon. We’re preparing something worth opening.</small>
          <Link href="/search" className="footer-explore">Discover a story <ArrowUpRight size={14} /></Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Bliss Media. Made for the curious.</span>
        <div>
          <Link href="/#about">Our point of view</Link>
          <Link href="#main">Back to top ↑</Link>
        </div>
      </div>
    </footer>
  )
}
