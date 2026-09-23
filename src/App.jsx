import { useEffect, useState } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { IS_HASH, BASENAME } from './lib/router'
import { app } from './lib/store'
import { settle, ScrollTrigger } from './lib/gsap'
import { visiblePages, SITE } from './platform/config'
import { feature } from './platform/motion'
import { IS_PREVIEW } from './platform/data'
import { TransitionProvider } from './components/PageTransition'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import CursorGlow from './components/ui/CursorGlow'
import Consent from './components/Consent'
import SplashScreen from './components/SplashScreen'
import SectionPage from './pages/SectionPage'
import CaseStudy from './pages/CaseStudy'
import CapabilityDetail from './pages/CapabilityDetail'
import Article from './pages/Article'
import NotFound from './pages/NotFound'

const Router = IS_HASH ? HashRouter : BrowserRouter
const SPLASH_KEY = 'site-intro-seen'
const clean = (p) => '/' + String(p || '').replace(/^\/+|\/+$/g, '')

function initialSplash() {
  if (IS_PREVIEW || !SITE.intro?.enabled || !feature('introSplash')) return false
  try {
    const path = IS_HASH ? window.location.hash.replace(/^#/, '') || '/' : window.location.pathname.slice((BASENAME || '').length) || '/'
    const force = new URLSearchParams(window.location.search).has('splash')
    if (path !== '/') return false
    if (force) return true
    return SITE.intro.oncePerSession === false ? true : !sessionStorage.getItem(SPLASH_KEY)
  } catch (e) {
    return true
  }
}

function LegacyCase() {
  const { slug } = useParams()
  return <Navigate to={`${clean(SITE.routes.caseStudies)}/${slug}`} replace />
}

function Announcer() {
  const loc = useLocation()
  const [msg, setMsg] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setMsg(document.title), 300)
    return () => clearTimeout(t)
  }, [loc.pathname])
  return <div aria-live="polite" role="status" className="sr-only">{msg}</div>
}

function Shell() {
  const loc = useLocation()
  const [splash] = useState(initialSplash)
  const [showSplash, setShowSplash] = useState(splash)
  if (!splash && !app.splashDone) app.setSplashDone(true)

  useEffect(() => { settle() }, [loc.pathname])
  useEffect(() => {
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  const cases = clean(SITE.routes.caseStudies)
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navigation />
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Routes>
          {visiblePages().map((p) => (
            <Route key={p.id} path={p.path} element={<SectionPage key={p.id} page={p} />} />
          ))}
          <Route path={`${cases}/:slug`} element={<CaseStudy />} />
          <Route path={`${clean(SITE.routes.capabilities)}/:slug`} element={<CapabilityDetail />} />
          <Route path={`${clean(SITE.routes.insights)}/:slug`} element={<Article />} />
          {/* addresses used by the previous site */}
          {cases !== '/case-studies' && <Route path="/case-studies" element={<Navigate to={cases} replace />} />}
          {cases !== '/case-studies' && <Route path="/case-studies/:slug" element={<LegacyCase />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CursorGlow />
      <Consent />
      <div className="grain" aria-hidden="true" />
      <Announcer />
      {showSplash && <SplashScreen storageKey={SPLASH_KEY} onDone={() => setShowSplash(false)} />}
    </>
  )
}

export default function App() {
  return (
    <Router basename={BASENAME}>
      <TransitionProvider>
        <Shell />
      </TransitionProvider>
    </Router>
  )
}
