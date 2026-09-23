import { useState } from 'react'
import { SITE } from '../platform/config'
import { MODE, IS_PREVIEW } from '../platform/data'
import MovingImage from '../components/ui/MovingImage'
import MagneticButton from '../components/ui/MagneticButton'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import Signal from '../components/ui/Signal'

/*
 * CONTACT — how to reach USFL. The form sends messages to the website server (they appear in the editor under
 * Inbox, and can also be forwarded to a webhook set in Site settings → Contact). Contact details are shown only
 * when they have been filled in under Site settings — nothing is ever invented.
 */
const DEFAULT_FIELDS = [
  { label: 'Your name', name: 'name', kind: 'text', required: true }, { label: 'Email', name: 'email', kind: 'email', required: true },
  { label: 'Company', name: 'company', kind: 'text' }, { label: 'What would you like to talk about?', name: 'message', kind: 'textarea', required: true, wide: true },
]
function Form({ formId, fields, labels = {} }) {
  const L = { submitLabel: 'Send', sendingLabel: 'Sending', successMessage: 'Thank you — we will be in touch.', errorMessage: 'Something went wrong sending that. Please try again.', ...labels }
  const [state, setState] = useState('idle')
  const [err, setErr] = useState('')
  const list = (fields?.length ? fields : DEFAULT_FIELDS).filter((f) => f && f.name)
  const onSubmit = async (e) => {
    e.preventDefault()
    const el = e.currentTarget
    const data = Object.fromEntries(new FormData(el).entries())
    if (IS_PREVIEW) { setState('sent'); return }
    setState('sending'); setErr('')
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(formId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...data, _page: window.location.pathname }) })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || L.errorMessage)
      setState('sent'); el.reset()
    } catch (x) {
      setState('error'); setErr(x.message || L.errorMessage)
    }
  }
  return (
    <form onSubmit={onSubmit} className="ct-form" aria-describedby="ct-status">
      {list.map((f, i) => {
        const id = `ct-${formId}-${f.name}`
        const common = { id, name: f.name, required: !!f.required, 'aria-required': f.required ? 'true' : undefined }
        const kind = f.kind || 'text'
        return (
          <div key={i} className={`ct-field${f.wide || kind === 'textarea' ? ' ct-wide' : ''}`}>
            <label htmlFor={id} className="mono dim">{f.label}{f.required ? '' : ' (optional)'}</label>
            {kind === 'textarea' ? <textarea {...common} rows={5} maxLength={5000} />
              : kind === 'select' ? <select {...common} defaultValue=""><option value="" disabled>Choose…</option>{(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>
                : <input {...common} type={['email', 'tel'].includes(kind) ? kind : 'text'} maxLength={300} autoComplete={kind === 'email' ? 'email' : f.name === 'name' ? 'name' : f.name === 'company' ? 'organization' : kind === 'tel' ? 'tel' : 'off'} />}
          </div>
        )
      })}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} />
      {L.consentLabel && <p className="ct-wide dim" style={{ margin: 0, fontSize: 14 }}>{L.consentLabel}</p>}
      <div className="ct-wide" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <MagneticButton type="submit" disabled={state === 'sending'}>{state === 'sending' ? L.sendingLabel : L.submitLabel}</MagneticButton>
        <p id="ct-status" role="status" className="mono dim" style={{ margin: 0, textTransform: 'none', letterSpacing: '.02em', fontSize: '.85rem' }}>
          {state === 'sent' ? L.successMessage : state === 'error' ? err : ''}
        </p>
      </div>
    </form>
  )
}

/** CONTACT section */
export default function ContactSection({ sid = 'contact', theme = 'light', eyebrow = '', heading = '', linkedinLabel = '', topics = [], image = '', imageAlt, form = {}, fields = [], showForm = true }) {
  const hid = `${sid}-h`
  // the form needs the website server; a static copy of the site shows the image instead
  const hasForm = showForm !== false && MODE !== 'static'
  const { phone, address } = SITE.contact || {}
  const linkedin = SITE.social?.linkedin
  return (
    <section data-theme={theme} className="section" aria-labelledby={hid} style={{ padding: 'calc(var(--section-space) * clamp(70px,9vw,150px)) 0 calc(var(--section-space) * clamp(90px,11vw,190px))' }}>
      <div className="wrap ct-grid">
        <div>
          {eyebrow && <p className="mono" style={{ margin: '0 0 24px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
          <ScrollText as="h2" id={hid} kind="left" className="display display-md" text={heading || eyebrow || 'Contact'} style={{ margin: 0, maxWidth: '20ch' }} />
          <ScrollReveal kind="up" delay={0.15} style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {linkedin && linkedinLabel && <MagneticButton href={linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${linkedinLabel} (opens in a new tab)`}>{linkedinLabel}</MagneticButton>}
            {SITE.contact.email && <MagneticButton href={`mailto:${SITE.contact.email}`} variant="ghost">{SITE.contact.email}</MagneticButton>}
            {phone && <MagneticButton href={`tel:${phone.replace(/[^+\d]/g, '')}`} variant="ghost">{phone}</MagneticButton>}
          </ScrollReveal>
          {address && <p className="dim" style={{ margin: '28px 0 0', whiteSpace: 'pre-line', maxWidth: '36ch' }}>{address}</p>}
          {topics.length > 0 && (
            <ul className="ct-topics">
              {topics.map((p, i) => (
                <li key={i}><ScrollReveal kind="up" delay={i * 0.08}><span className="mono dim">{String(i + 1).padStart(2, '0')}</span><h3 className="display display-sm" style={{ margin: '8px 0 6px' }}>{p.title}</h3><p className="dim" style={{ margin: 0, maxWidth: '44ch', fontSize: 15 }}>{p.text}</p></ScrollReveal></li>
              ))}
            </ul>
          )}
        </div>
        <div>
          {hasForm ? <Form formId={sid} fields={fields} labels={form} /> : image ? (
            <MovingImage name={image} alt={imageAlt} aspect="4/5" speed={9} reveal="up" className="ct-img" sizes="(min-width:900px) 34vw, 92vw" />
          ) : null}
        </div>
      </div>
        <style>{`
          .ct-grid{display:grid;gap:clamp(40px,6vw,110px);grid-template-columns:1fr;align-items:start}
          .ct-topics{list-style:none;margin:clamp(40px,6vw,80px) 0 0;padding:0;display:grid;gap:26px}
          .ct-topics li{border-top:1px solid var(--line-light);padding-top:16px}
          .ct-img{width:100%;max-width:480px;justify-self:end}
          .ct-form{display:grid;gap:26px 24px;grid-template-columns:1fr 1fr;position:relative}
          .ct-wide{grid-column:1/-1}
          .ct-field{display:grid;gap:10px}
          .ct-field label{display:block}
          .ct-field input,.ct-field textarea,.ct-field select{font:inherit;font-size:1.05rem;background:transparent;border:0;border-bottom:1px solid color-mix(in srgb, var(--line-light-base) 30%, transparent);padding:12px 0;color:var(--text-on-light);border-radius:0;outline:none;transition:border-color .4s;width:100%}
          .ct-field input:focus,.ct-field textarea:focus,.ct-field select:focus{border-color:var(--signal-ink);box-shadow:0 1px 0 0 var(--signal-ink)}
          @media(max-width:600px){.ct-form{grid-template-columns:1fr}}
          @media(min-width:900px){.ct-grid{grid-template-columns:1fr 1fr}}
        `}</style>
    </section>
  )
}
