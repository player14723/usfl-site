import { Component } from 'react'
import { SECTIONS } from './registry'
import { MotionScope } from '../platform/motion'
import { IS_PREVIEW } from '../platform/data'

/** One broken section (e.g. a mistyped setting) must never take the page down with it. */
class SectionBoundary extends Component {
  constructor(p) { super(p); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error(`[sections] "${this.props.name}" could not be shown and was skipped:`, err) }
  render() { return this.state.failed ? null : this.props.children }
}

const warned = new Set()

/** Renders a page's ordered section list. Hidden sections are skipped; unknown types are skipped with a warning. */
export default function Sections({ sections = [], docKey }) {
  return sections.map((s, i) => {
    if (!s || s.hidden) return null
    const entry = SECTIONS[s.type]
    if (!entry) {
      if (import.meta.env.DEV && !warned.has(s.type)) { warned.add(s.type); console.warn(`[sections] unknown section type "${s.type}" — skipped`) }
      return null
    }
    const { type, id, hidden, motion, spacing, hideOn, ...props } = s
    const hide = Array.isArray(hideOn) ? hideOn.filter((d) => ['mobile', 'tablet', 'desktop'].includes(d)).join(' ') : ''
    const sid = String(id || `${type}-${i}`).replace(/[^a-zA-Z0-9_-]/g, '-')
    const Comp = entry.component
    const finalProps = entry.map ? entry.map(props, sid) : { sid, ...props }
    return (
      <div key={`${sid}-${i}`} className={`sec${motion === 'none' ? ' motion-off' : ''}`} data-spacing={spacing || 'default'} data-section={type} data-hide={hide || undefined}
        {...(IS_PREVIEW ? { 'data-edit-doc': docKey, 'data-edit-sec': i } : {})}>
        <MotionScope preset={motion}>
          <SectionBoundary name={`${type} (${sid})`}>
            <Comp {...finalProps} />
          </SectionBoundary>
        </MotionScope>
      </div>
    )
  })
}
