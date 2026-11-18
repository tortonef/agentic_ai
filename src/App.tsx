import { useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { AmbientBackground } from './components/AmbientBackground'
import { Hero } from './sections/Hero'
import { Lab } from './sections/Lab'
import { Projects } from './sections/Projects'
import { About } from './sections/About'
import { Skills } from './sections/Skills'
import { Contact } from './sections/Contact'

export default function App() {
  // Deep links (/#projects): the browser tries to jump before React has rendered the sections.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1))
    if (!id) return
    history.scrollRestoration = 'manual'
    const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
    // shortcut: second jump re-aligns after the lazy demo chunk changes page height; use a load signal if demos get much heavier.
    const timers = [setTimeout(go, 100), setTimeout(go, 900)]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <AmbientBackground />
      <Navbar />
      <main id="main" className="relative">
        <Hero />
        <Lab />
        <Projects />
        <About />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
