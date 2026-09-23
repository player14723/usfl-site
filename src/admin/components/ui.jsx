import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state'

/* ---------- icons (simple strokes, 20px) ---------- */
const P = {
  pages: 'M5 3h7l4 4v10H5z M12 3v4h4', grid: 'M3 3h6v6H3z M11 3h6v6h-6z M3 11h6v6H3z M11 11h6v6h-6z', image: 'M3 4h14v12H3z M3 13l4-4 3 3 3-3 4 4 M13 7.5a1 1 0 1 0 0 .01',
  film: 'M3 4h14v12H3z M6 4v12 M14 4v12 M3 8h3 M3 12h3 M14 8h3 M14 12h3', settings: 'M10 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4.3 4.3l1.4 1.4 M14.3 14.3l1.4 1.4 M4.3 15.7l1.4-1.4 M14.3 5.7l1.4-1.4',
  palette: 'M10 3a7 7 0 1 0 0 14c1 0 1.5-.8 1.2-1.6-.4-1 .2-2 1.3-2H15a2 2 0 0 0 2-2A7 7 0 0 0 10 3z M6.5 9.5h.01 M9 6.5h.01 M13 7.5h.01', motion: 'M3 10h4l2-5 3 10 2-5h3',
  nav: 'M3 5h14 M3 10h14 M3 15h9', history: 'M4 10a6 6 0 1 0 2-4.5 M4 3v3h3 M10 7v3l2 2', users: 'M7 9a3 3 0 1 0 0-6a3 3 0 1 0 0 6 M2 17c0-3 2-5 5-5s5 2 5 5 M13 3.5a3 3 0 0 1 0 5.5 M15 12c2 .5 3 2.5 3 5',
  inbox: 'M3 11l2-7h10l2 7v5H3z M3 11h4l1 2h4l1-2h4', home: 'M3 9l7-6 7 6v8H3z M8 17v-5h4v5', plus: 'M10 4v12 M4 10h12', trash: 'M4 6h12 M8 6V4h4v2 M6 6l1 11h6l1-11',
  copy: 'M7 7h9v10H7z M4 13V3h9', eye: 'M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z M10 8a2 2 0 1 0 0 4a2 2 0 1 0 0-4', eyeOff: 'M3 3l14 14 M8.5 5.2A7.7 7.7 0 0 1 10 4c5 0 8 6 8 6a14 14 0 0 1-2.4 3 M5.2 6.9C3.2 8.3 2 10 2 10s3 6 8 6c1.3 0 2.5-.3 3.5-.8',
  up: 'M10 16V4 M5 9l5-5 5 5', down: 'M10 4v12 M5 11l5 5 5-5', drag: 'M7 5h.01 M13 5h.01 M7 10h.01 M13 10h.01 M7 15h.01 M13 15h.01', close: 'M5 5l10 10 M15 5L5 15',
  undo: 'M7 5L3 9l4 4 M3 9h9a5 5 0 0 1 0 10h-2', redo: 'M13 5l4 4-4 4 M17 9H8a5 5 0 0 0 0 10h2', desktop: 'M2 4h16v10H2z M7 17h6 M10 14v3', tablet: 'M5 2h10v16H5z M9 15h2', mobile: 'M6 2h8v16H6z M9 15h2',
  external: 'M11 3h6v6 M17 3l-8 8 M15 12v5H3V5h5', check: 'M4 10l4 4 8-8', alert: 'M10 3l8 14H2z M10 8v4 M10 14.5h.01', upload: 'M10 14V3 M5 8l5-5 5 5 M3 17h14', search: 'M8.5 3a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11 M13 13l4 4',
  cursor: 'M4 3l12 6-5 1.5L9 16z', globe: 'M10 2a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M2 10h16 M10 2c2.5 2.5 2.5 13.5 0 16 M10 2c-2.5 2.5-2.5 13.5 0 16', logout: 'M8 4H4v12h4 M12 6l4 4-4 4 M16 10H7', key: 'M7 10a3 3 0 1 0 0 .01 M10 10h8 M15 10v3 M18 10v2',
  more: 'M5 10h.01 M10 10h.01 M15 10h.01', chevron: 'M8 5l5 5-5 5', chevronDown: 'M5 8l5 5 5-5', layers: 'M10 3l8 4-8 4-8-4z M2 11l8 4 8-4 M2 14.5l8 4 8-4', star: 'M10 3l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5L2.8 8.2l5-.6z',
}
export function Icon({ name, size = 18, title }) {
  const d = P[name] || P.more
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {d.split(' M').map((seg, i) => <path key={i} d={(i ? 'M' : '') + seg} />)}
    </svg>
  )
}

export function Button({ children, icon, tone = 'default', size, className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn-${tone} ${size ? `btn-${size}` : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}{children && <span>{children}</span>}
    </button>
  )
}
export function IconButton({ icon, label, ...rest }) {
  return <button type="button" className="ibtn" aria-label={label} title={label} {...rest}><Icon name={icon} /></button>
}

export function Badge({ tone = 'default', children }) { return <span className={`badge badge-${tone}`}>{children}</span> }

/* ---------- modal ---------- */
export function Modal({ title, onClose, children, footer, wide = false, labelledBy }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    const el = ref.current
    const focusables = () => [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled)
    ;(el.querySelector('[data-autofocus]') || focusables()[0])?.focus()
    const key = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    el.addEventListener('keydown', key)
    return () => { el.removeEventListener('keydown', key); prev?.focus?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const id = labelledBy || 'modal-title'
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header className="modal-head"><h2 id={id}>{title}</h2>{onClose && <IconButton icon="close" label="Close" onClick={onClose} />}</header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

/* ---------- confirmation dialog + toasts (rendered once by the shell) ---------- */
export function Dialogs() {
  const { dialog, setDialog, toasts } = useApp()
  const [text, setText] = useState('')
  const close = (v) => { dialog?.resolve(v); setDialog(null); setText('') }
  return (
    <>
      {dialog && (
        <Modal title={dialog.title} onClose={() => close(false)} footer={
          <>
            <Button onClick={() => close(false)}>{dialog.cancel || 'Cancel'}</Button>
            <Button tone={dialog.tone === 'danger' ? 'danger' : 'primary'} data-autofocus disabled={dialog.typeToConfirm && text !== dialog.typeToConfirm} onClick={() => close(dialog.prompt ? text : true)}>{dialog.confirm || 'OK'}</Button>
          </>
        }>
          {typeof dialog.body === 'string' ? <p>{dialog.body}</p> : dialog.body}
          {dialog.list?.length > 0 && <ul className="plain-list">{dialog.list.map((x, i) => <li key={i}>{x}</li>)}</ul>}
          {(dialog.typeToConfirm || dialog.prompt) && (
            <label className="field"><span className="field-label">{dialog.typeToConfirm ? `Type “${dialog.typeToConfirm}” to confirm` : dialog.prompt}</span>
              <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={dialog.placeholder || ''} /></label>
          )}
        </Modal>
      )}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.tone}`}><Icon name={t.tone === 'error' ? 'alert' : 'check'} /> {t.message}</div>)}
      </div>
    </>
  )
}

export function SaveStatus({ status, savedAt }) {
  const m = {
    loading: ['Loading…', 'muted'], saved: ['Draft saved', 'ok'], unsaved: ['Unsaved changes…', 'muted'], saving: ['Saving draft…', 'muted'],
    error: ['Not saved — retrying on next change', 'danger'], conflict: ['Changed by someone else — reload', 'danger'], deleted: ['Marked for removal', 'danger'], missing: ['Not found', 'danger'],
  }[status] || ['', 'muted']
  return <span className={`save-status tone-${m[1]}`} aria-live="polite"><span className="dot" /><span className={m[1] === 'danger' ? '' : 'save-text'} title={m[0]}>{m[0]}</span></span>
}

export function Empty({ title, children, action }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>{t.label}{t.count ? <span className="tab-count">{t.count}</span> : null}</button>)}
    </div>
  )
}
