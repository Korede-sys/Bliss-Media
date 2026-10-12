'use client'
import Link from 'next/link'
import { Search, Menu, X } from 'lucide-react'
import { useState } from 'react'
const categories=['Technology','Entertainment','Lifestyle','Business','News']
export function SiteHeader(){const [open,setOpen]=useState(false);return <header className="site-header"><div className="topline"><span>MONDAY, OCTOBER 12, 2026</span><span className="top-note">Stories for a life well lived.</span><a href="#newsletter">THE BLISS LETTER ↗</a></div><div className="masthead"><button className="icon-button menu-toggle" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={19}/>:<Menu size={19}/>}</button><Link className="wordmark" href="/">bliss<span>.</span></Link><span className="tagline">A magazine for what matters</span><Link className="search-link" href="/search"><Search size={17}/><span>Search</span></Link></div><nav className={`category-nav ${open?'is-open':''}`} aria-label="Main navigation"><Link href="/">The Journal</Link>{categories.map(c=><Link key={c} href={`/category/${c.toLowerCase()}`}>{c}</Link>)}<Link className="nav-search-mobile" href="/search">Search stories</Link></nav></header>}
