'use client'

import Link from 'next/link'
import { Search, Menu, X, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

const categories = ['Technology', 'Entertainment', 'Lifestyle', 'Business', 'News']

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="topline">
        <span className="topline-note">AN INDEPENDENT DIGITAL JOURNAL</span>
        <span className="top-note">Stories. Perspectives. Culture.</span>
        <Link href="/search" className="topline-discover">
          FIND YOUR NEXT READ <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>

      <div className="masthead">
        <button
          className="icon-button menu-toggle"
          type="button"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen(value => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link className="wordmark" href="/" aria-label="Bliss Media home">
          bliss<span>.</span>
        </Link>
        <span className="tagline">Stories. Perspectives. Culture.</span>
        <Link className="search-link" href="/search" aria-label="Search Bliss Media">
          <Search size={17} aria-hidden="true" />
          <span>Search</span>
        </Link>
      </div>

      <nav
        id="primary-navigation"
        className={`category-nav ${open ? 'is-open' : ''}`}
        aria-label="Main navigation"
      >
        <Link href="/" onClick={() => setOpen(false)}>The Journal</Link>
        {categories.map(category => (
          <Link
            key={category}
            href={`/category/${category.toLowerCase()}`}
            onClick={() => setOpen(false)}
          >
            {category}
          </Link>
        ))}
        <Link className="nav-search-mobile" href="/search" onClick={() => setOpen(false)}>
          Search stories
        </Link>
      </nav>
    </header>
  )
}
