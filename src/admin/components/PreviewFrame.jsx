import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export const DEVICES = {
  desktop: { label: 'Desktop', width: 1440, height: 900 },
  tablet: { label: 'Tablet', width: 834, height: 1112 },
  mobile: { label: 'Mobile', width: 390, height: 844 },
}

/**
 * The real website (draft) inside the editor. It is the same page visitors get — only the content is the draft.
 * reloadKey: change it to reload after a save · mode: 'edit' (click to select) | 'browse' (links work)
 */
export default function PreviewFrame({ path = '/', device = 'desktop', mode = 'edit', reloadKey = 0, highlight, onMessage, title = 'Website preview', fill = false }) {
  const wrap = useRef(null)
  const frame = useRef(null)
  const [box, setBox] = useState({ w: 1000, h: 700 })
  const [loading, setLoading] = useState(true)
  const src = `${path}${path.includes('?') ? '&' : '?'}__preview=1`
  const first = useRef(true)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // reload after saves (keeps the page the preview is on, and its scroll position)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const w = frame.current?.contentWindow
    if (!w) return
    setLoading(true)
    try { w.location.reload() } catch { frame.current.src = src }
  }, [reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // messages from the page
  useEffect(() => {
    const h = (e) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow || e.data?.src !== 'usfl-preview') return
      if (e.data.type === 'ready') { setLoading(false); post({ type: 'mode', mode }); if (highlight) post({ type: 'highlight', ...highlight, scroll: false }) }
      onMessage?.(e.data)
    }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const post = (m) => frame.current?.contentWindow?.postMessage({ src: 'usfl-editor', ...m }, window.location.origin)
  useEffect(() => { post({ type: 'mode', mode }) }, [mode])
  useEffect(() => { if (highlight) post({ type: 'highlight', ...highlight, scroll: true }) }, [highlight?.doc, highlight?.field, highlight?.section, highlight?.tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const d = DEVICES[device] || DEVICES.desktop
  const pad = fill ? 0 : 24
  const scale = Math.min(1, (box.w - pad * 2) / d.width)
  const frameH = device === 'desktop' || fill ? Math.max(400, (box.h - pad * 2) / scale) : Math.min(d.height, (box.h - pad * 2) / scale)

  return (
    <div ref={wrap} className={`pf ${fill ? 'pf-fill' : ''}`}>
      <div className="pf-stage" style={{ width: d.width * scale, height: frameH * scale }}>
        <iframe
          ref={frame}
          key={path}
          src={src}
          title={title}
          className={`pf-frame pf-${device}`}
          style={{ width: d.width, height: frameH, transform: `scale(${scale})` }}
          onLoad={() => setTimeout(() => setLoading(false), 4000)}
        />
        {loading && <div className="pf-loading" aria-live="polite"><span className="spinner" /> Loading preview…</div>}
      </div>
    </div>
  )
}
