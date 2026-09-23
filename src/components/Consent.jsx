import { useEffect, useState } from 'react'
import { SITE } from '../platform/config'
import { MODE } from '../platform/data'
import TLink from './ui/TLink'

/**
 * Privacy notice + analytics (Site settings → Privacy & cookies / Analytics).
 * Analytics load only on the live site, and — when "Ask for consent" is on — only after the visitor accepts.
 * The visitor's choice is remembered in their own browser.
 */
const KEY = 'site-consent'
const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const write = (v) => { try { localStorage.setItem(KEY, v) } catch {} }

function loadAnalytics(a) {
  if (window.__analyticsLoaded) return
  window.__analyticsLoaded = true
  if (a.plausibleDomain) {
    const s = document.createElement('script')
    s.defer = true; s.src = 'https://plausible.io/js/script.js'; s.dataset.domain = a.plausibleDomain
    document.head.appendChild(s)
  }
  if (/^G-[A-Z0-9]+$/i.test(a.googleTagId || '')) {
    const s = document.createElement('script')
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(a.googleTagId)}`
    document.head.appendChild(s)
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() { window.dataLayer.push(arguments) } // eslint-disable-line prefer-rest-params
    window.gtag('js', new Date())
    window.gtag('config', a.googleTagId, { anonymize_ip: true })
  }
}

export default function Consent() {
  const a = SITE.analytics || {}
  const p = SITE.privacy || {}
  const hasAnalytics = Boolean(a.plausibleDomain || a.googleTagId)
  const needsAsk = (p.showNotice || (hasAnalytics && a.requireConsent !== false)) && MODE !== 'preview'
  const [choice, setChoice] = useState(read)
  useEffect(() => {
    if (MODE !== 'live' || !hasAnalytics) return
    if (a.requireConsent === false || choice === 'accepted') loadAnalytics(a)
  }, [choice]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!needsAsk || choice) return null
  const decide = (v) => { write(v); setChoice(v) }
  return (
    <div role="region" aria-label="Privacy" className="consent" data-theme="dark">
      <p style={{ margin: 0, maxWidth: '62ch', fontSize: 14 }}>
        {p.noticeText || 'This website uses cookies to understand how it is used.'}{' '}
        {p.policyLink?.to && <TLink to={p.policyLink.to} className="tlink">{p.policyLink.label || 'Privacy policy'}</TLink>}
      </p>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button type="button" className="btn" onClick={() => decide('accepted')}>{p.acceptLabel || 'Accept'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => decide('declined')}>{p.declineLabel || 'Decline'}</button>
      </div>
      <style>{`.consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:150;display:flex;flex-wrap:wrap;gap:16px 24px;align-items:center;justify-content:space-between;padding:16px 20px;background:var(--ink3);color:var(--light);border:var(--hair-w) solid var(--line-dark);border-radius:var(--radius-card)}@media(min-width:900px){.consent{left:auto;max-width:720px}}`}</style>
    </div>
  )
}
