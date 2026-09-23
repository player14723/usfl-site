import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { Button, Icon, IconButton } from './ui'
import MediaPicker from './MediaPicker'
import { plain } from '../lib'
import { contrastRatio } from '../../../shared/validate.js'

/**
 * Renders a schema (shared/schema.js) as a form.
 *   <Fields fields={…} value={obj} onChange={(path, v) => …} base="sections.3" focus="sections.3.lead" />
 * `path` is always relative to the document root, so a field click in the preview can be matched to its input.
 */
export default function Fields({ fields, value, onChange, base = '', focus, group }) {
  const list = group ? fields.filter((f) => (f.group || 'content') === group) : fields
  return (
    <div className="fields">
      {list.map((f) => <Field key={f.name} field={f} value={value?.[f.name]} onChange={onChange} path={base ? `${base}.${f.name}` : f.name} focus={focus} parent={value} />)}
    </div>
  )
}

const isFocus = (focus, path) => focus && (focus === path || focus.startsWith(path + '.'))

function useFocusRef(focus, path) {
  const ref = useRef(null)
  const hit = focus === path
  useEffect(() => {
    if (!hit || !ref.current) return
    ref.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const input = ref.current.querySelector('input, textarea, select, button')
    // wait past a possible double-click: if the person starts editing on the page itself, leave the focus there
    const t = setTimeout(() => { if (!window.__inlineEditing) input?.focus({ preventScroll: true }) }, 450)
    return () => clearTimeout(t)
  }, [hit, focus])
  return [ref, hit]
}

function Label({ field, htmlFor, children }) {
  return (
    <div className="field-top">
      <label className="field-label" htmlFor={htmlFor}>{field.label}{field.required && <span className="req" aria-hidden="true"> *</span>}</label>
      {children}
    </div>
  )
}
const Hint = ({ field }) => (field.hint ? <p className="field-hint">{field.hint}</p> : null)
const idOf = (path) => `f-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`

export function Field({ field, value, onChange, path, focus, parent }) {
  const [ref, hit] = useFocusRef(focus, path)
  const id = idOf(path)
  const set = (v) => onChange(path, v)
  const T = field.type
  let body
  if (T === 'text') body = <input id={id} className="input" value={value ?? ''} onChange={(e) => set(e.target.value)} placeholder={field.placeholder || ''} list={field.linkTarget ? 'site-paths' : undefined} />
  else if (T === 'textarea') body = <AutoTextarea id={id} value={value ?? ''} onChange={set} />
  else if (T === 'toggle') body = <Toggle id={id} checked={value ?? field.default ?? false} onChange={set} />
  else if (T === 'number') body = <input id={id} className="input input-num" type="number" value={value ?? ''} min={field.min} max={field.max} step={field.step ?? 'any'} onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))} placeholder={field.default != null ? String(field.default) : ''} />
  else if (T === 'select') body = (
    <select id={id} className="input" value={value ?? field.default ?? ''} onChange={(e) => { const o = field.options.find((x) => String(x.value) === e.target.value); set(o ? o.value : e.target.value) }}>
      {!field.options.some((o) => String(o.value) === String(value ?? field.default ?? '')) && <option value={value ?? ''}>{String(value ?? '— choose —')}</option>}
      {field.options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
  )
  else if (T === 'color') body = <ColorInput id={id} value={value} onChange={set} name={field.name} parent={parent} />
  else if (T === 'image' || T === 'video') body = <MediaInput id={id} kind={T} value={value} onChange={set} />
  else if (T === 'cinematic') body = <CinematicSelect id={id} value={value} onChange={set} />
  else if (T === 'ref') body = <RefInput id={id} field={field} value={value} onChange={set} />
  else if (T === 'lines') body = <LinesInput id={id} value={value} onChange={set} markup={field.markup} />
  else if (T === 'link') body = <LinkInput id={id} value={value} onChange={set} />
  else if (T === 'devices') body = <Devices id={id} value={value} onChange={set} />
  else if (T === 'object') return <ObjectField field={field} value={value} onChange={onChange} path={path} focus={focus} innerRef={ref} hit={hit} />
  else if (T === 'list') return <ListField field={field} value={value} onChange={onChange} path={path} focus={focus} innerRef={ref} />
  else if (T === 'typed') return <TypedList field={field} value={value} onChange={onChange} path={path} focus={focus} innerRef={ref} />
  else body = <input id={id} className="input" value={value ?? ''} onChange={(e) => set(e.target.value)} />
  return (
    <div ref={ref} className={`field ${hit ? 'is-focused' : ''} ${T === 'toggle' ? 'field-inline' : ''}`} data-path={path}>
      <Label field={field} htmlFor={id}>{field.markup && <span className="field-tip" title="Wrap words in *asterisks* to set them in the italic serif">*italic*</span>}</Label>
      {body}
      <Hint field={field} />
    </div>
  )
}

function AutoTextarea({ id, value, onChange }) {
  const ref = useRef(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(420, el.scrollHeight + 2)}px` } }, [value])
  return <textarea ref={ref} id={id} className="input" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
}

export function Toggle({ id, checked, onChange, label }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={!!checked} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="switch-knob" />{label && <span className="switch-label">{label}</span>}
    </button>
  )
}

function ColorInput({ id, value, onChange, name, parent }) {
  const v = value || ''
  const valid = /^#[0-9a-f]{6}$/i.test(v)
  // show a contrast check for text colours
  const bg = /OnDark|^textOnDark|^mutedOnDark/.test(name) ? parent?.ink : /OnLight/.test(name) ? parent?.paper : name === 'buttonText' ? parent?.buttonBackground : null
  const ratio = valid && bg ? contrastRatio(v, bg) : null
  return (
    <div className="color-row">
      <input type="color" aria-label="Pick a colour" value={valid ? v : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      <input id={id} className="input input-mono" value={v} maxLength={7} onChange={(e) => onChange(e.target.value)} placeholder="#000000" />
      {ratio != null && <span className={`contrast ${ratio >= 4.5 ? 'ok' : ratio >= 3 ? 'warn' : 'bad'}`} title="Contrast against its background">{ratio.toFixed(1)}:1</span>}
    </div>
  )
}

export const srcOf = (v) => (!v ? '' : /^(\/|https?:|data:)/.test(v) ? v : `/images/${v}.webp`)
function MediaInput({ id, kind, value, onChange }) {
  const [open, setOpen] = useState(false)
  const src = srcOf(value)
  return (
    <div className="media-input">
      <button id={id} type="button" className={`media-thumb ${src ? '' : 'empty'}`} onClick={() => setOpen(true)} aria-label={src ? `Replace ${kind}` : `Choose ${kind}`}>
        {src ? (kind === 'video' ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" />) : <Icon name={kind === 'video' ? 'film' : 'image'} size={22} />}
      </button>
      <div className="media-input-side">
        <span className="media-path" title={src}>{src ? src.split('/').pop() : `No ${kind}`}</span>
        <div className="row-gap">
          <Button size="sm" onClick={() => setOpen(true)}>{src ? 'Replace' : 'Choose'}</Button>
          {src && <Button size="sm" tone="ghost" onClick={() => onChange('')}>Remove</Button>}
        </div>
      </div>
      {open && <MediaPicker kind={kind} current={src} onClose={() => setOpen(false)} onPick={(m) => { onChange(m.src); setOpen(false) }} />}
    </div>
  )
}

function CinematicSelect({ id, value, onChange }) {
  const { site } = useApp()
  const list = site?.media?.cinematics || []
  return (
    <div className="row-gap">
      <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">None</option>
        {!list.some((c) => c.id === value) && value && <option value={value}>{value} (missing)</option>}
        {list.map((c) => <option key={c.id} value={c.id}>{c.id}{c.enabled === false ? ' (switched off)' : ''} — {c.type === 'still' ? 'photo move' : 'video'}</option>)}
      </select>
      <a className="link-sm" href="/admin/settings/media">Manage films</a>
    </div>
  )
}

function RefInput({ id, field, value, onChange }) {
  const { site } = useApp()
  const opts = useMemo(() => {
    if (!site) return []
    if (field.collection === 'case') return site.cases.map((c) => ({ value: c.slug, label: plain(c.title) + (c.hidden ? ' (hidden)' : '') }))
    if (field.collection === 'capability') return site.capabilities.map((c) => ({ value: c.slug, label: c.name + (c.hidden ? ' (hidden)' : '') }))
    if (field.collection === 'insight') return site.insights.map((c) => ({ value: c.slug, label: plain(c.title) }))
    if (field.collection === 'stage') return (site.system?.stages || []).map((s) => ({ value: s.key, label: s.name }))
    return []
  }, [site, field.collection])
  if (!field.multiple) {
    return (
      <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— none —</option>
        {value && !opts.some((o) => o.value === value) && <option value={value}>{value} (missing)</option>}
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }
  const arr = Array.isArray(value) ? value : []
  const toggle = (v) => onChange(arr.includes(v) ? arr.filter((x) => x !== v) : field.max && arr.length >= field.max ? [...arr.slice(1), v] : [...arr, v])
  return (
    <div id={id} className="checks" role="group">
      {opts.map((o) => (
        <label key={o.value} className="check"><input type="checkbox" checked={arr.includes(o.value)} onChange={() => toggle(o.value)} /> {o.label}{arr.includes(o.value) && field.multiple && arr.length > 1 ? <span className="check-n">{arr.indexOf(o.value) + 1}</span> : null}</label>
      ))}
      {!opts.length && <p className="field-hint">Nothing to choose from yet.</p>}
      {field.max && <p className="field-hint">Choose up to {field.max}. The order you tick them is the order shown.</p>}
    </div>
  )
}

function LinesInput({ id, value, onChange }) {
  const arr = Array.isArray(value) ? value : value ? [String(value)] : []
  const set = (i, v) => onChange(arr.map((x, j) => (j === i ? v : x)))
  const move = (i, d) => { const a = [...arr]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a) }
  return (
    <div className="lines">
      {arr.map((l, i) => (
        <div key={i} className="line-row">
          <input id={i === 0 ? id : undefined} className="input" value={l} onChange={(e) => set(i, e.target.value)} aria-label={`Line ${i + 1}`} />
          <IconButton icon="up" label="Move up" disabled={i === 0} onClick={() => move(i, -1)} />
          <IconButton icon="close" label="Remove line" onClick={() => onChange(arr.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="sm" tone="ghost" icon="plus" onClick={() => onChange([...arr, ''])}>Add line</Button>
    </div>
  )
}

function LinkInput({ id, value, onChange }) {
  const v = value || {}
  return (
    <div className="link-input">
      <input id={id} className="input" placeholder="Label" value={v.label ?? ''} onChange={(e) => onChange({ ...v, label: e.target.value })} aria-label="Link label" />
      <input className="input" placeholder="/page or https://…" list="site-paths" value={v.to ?? ''} onChange={(e) => onChange({ ...v, to: e.target.value })} aria-label="Link address" />
    </div>
  )
}

function Devices({ id, value, onChange }) {
  const arr = Array.isArray(value) ? value : []
  const t = (d) => onChange(arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d])
  return (
    <div id={id} className="devices" role="group">
      {[['mobile', 'Phones'], ['tablet', 'Tablets'], ['desktop', 'Desktops']].map(([d, l]) => (
        <label key={d} className={`device-chip ${arr.includes(d) ? 'on' : ''}`}><input type="checkbox" checked={arr.includes(d)} onChange={() => t(d)} /><Icon name={d} size={15} /> {l}</label>
      ))}
    </div>
  )
}

function ObjectField({ field, value, onChange, path, focus, innerRef, hit }) {
  const [open, setOpen] = useState(field.open || isFocus(focus, path))
  useEffect(() => { if (isFocus(focus, path)) setOpen(true) }, [focus, path])
  const v = field.asArray ? Object.fromEntries((Array.isArray(value) ? value : []).map((x, i) => [String(i), x])) : value || {}
  const change = field.asArray
    ? (p, nv) => { const k = p.slice(path.length + 1); const arr = Array.isArray(value) ? [...value] : []; arr[Number(k)] = nv; onChange(path, arr) }
    : onChange
  return (
    <div ref={innerRef} className={`group ${open ? 'open' : ''} ${hit ? 'is-focused' : ''}`} data-path={path}>
      <button type="button" className="group-head" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? 'chevronDown' : 'chevron'} size={15} /> {field.label}</button>
      {open && <div className="group-body"><Fields fields={field.fields} value={v} onChange={change} base={path} focus={focus} /></div>}
    </div>
  )
}

function itemTitle(field, item, i) {
  if (typeof item === 'string') return item ? item.split('/').pop().slice(0, 60) : `Item ${i + 1}`
  const k = field.itemLabel
  const t = (k && item?.[k]) || item?.title || item?.label || item?.name || item?.text || ''
  return plain(t).slice(0, 60) || `Item ${i + 1}`
}

function ListField({ field, value, onChange, path, focus, innerRef }) {
  const { confirm } = useApp()
  const arr = Array.isArray(value) ? value : []
  const [open, setOpen] = useState(() => new Set())
  useEffect(() => {
    if (!focus || !focus.startsWith(path + '.')) return
    const i = Number(focus.slice(path.length + 1).split('.')[0])
    if (!Number.isNaN(i)) setOpen((s) => new Set(s).add(i))
  }, [focus, path])
  const set = (a) => onChange(path, a)
  const blank = () => (field.asStrings ? '' : Object.fromEntries(field.fields.filter((f) => f.default !== undefined).map((f) => [f.name, f.default])))
  const move = (i, d) => { const a = [...arr]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); set(a) }
  const remove = async (i) => { if (await confirm({ title: 'Remove this item?', body: `“${itemTitle(field, arr[i], i)}” will be removed. You can undo this.`, confirm: 'Remove', tone: 'danger' })) set(arr.filter((_, j) => j !== i)) }
  const drag = useRef(null)
  return (
    <div ref={innerRef} className="list" data-path={path}>
      <div className="list-head"><span className="field-label">{field.label}</span><span className="list-count">{arr.length}</span></div>
      <Hint field={field} />
      {arr.map((item, i) => {
        const isOpen = open.has(i)
        const ipath = `${path}.${i}`
        return (
          <div key={i} className={`list-item ${isOpen ? 'open' : ''}`} draggable onDragStart={() => { drag.current = i }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag.current != null && drag.current !== i) move(drag.current, i - drag.current); drag.current = null }}>
            <div className="list-item-head">
              <span className="drag" aria-hidden="true"><Icon name="drag" size={15} /></span>
              <button type="button" className="list-item-title" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })}>{itemTitle(field, item, i)}</button>
              <IconButton icon="up" label="Move up" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon="down" label="Move down" disabled={i === arr.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon="copy" label="Duplicate" onClick={() => { const a = [...arr]; a.splice(i + 1, 0, JSON.parse(JSON.stringify(item))); set(a) }} />
              <IconButton icon="trash" label="Remove" onClick={() => remove(i)} />
            </div>
            {isOpen && (
              <div className="list-item-body">
                {field.asStrings
                  ? <Field field={{ ...field.fields.find((f) => f.name === field.asStrings), label: field.fields.find((f) => f.name === field.asStrings).label }} value={item} onChange={(p, v) => { const a = [...arr]; a[i] = v; set(a) }} path={ipath} focus={focus} />
                  : <Fields fields={field.fields} value={item} onChange={onChange} base={ipath} focus={focus} />}
              </div>
            )}
          </div>
        )
      })}
      {(!field.max || arr.length < field.max) && <Button size="sm" tone="ghost" icon="plus" onClick={() => { set([...arr, blank()]); setOpen((s) => new Set(s).add(arr.length)) }}>Add {field.label.toLowerCase().replace(/s$/, '').replace(/\(.*\)/, '').trim()}</Button>}
    </div>
  )
}

function TypedList({ field, value, onChange, path, focus, innerRef }) {
  const { confirm } = useApp()
  const arr = Array.isArray(value) ? value : []
  const [open, setOpen] = useState(() => new Set())
  const set = (a) => onChange(path, a)
  const move = (i, d) => { const a = [...arr]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); set(a) }
  const typeOf = (t) => field.types.find((x) => x.type === t)
  return (
    <div ref={innerRef} className="list" data-path={path}>
      <div className="list-head"><span className="field-label">{field.label}</span><span className="list-count">{arr.length} blocks</span></div>
      {arr.map((item, i) => {
        const def = typeOf(item?.type)
        const isOpen = open.has(i)
        return (
          <div key={i} className={`list-item ${isOpen ? 'open' : ''}`}>
            <div className="list-item-head">
              <span className="list-type">{def?.label || item?.type}</span>
              <button type="button" className="list-item-title" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })}>{plain(item?.text || item?.heading || (item?.items || []).join(', ')).slice(0, 60) || '(empty)'}</button>
              <IconButton icon="up" label="Move up" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon="down" label="Move down" disabled={i === arr.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon="trash" label="Remove" onClick={async () => { if (await confirm({ title: 'Remove this block?', confirm: 'Remove', tone: 'danger' })) set(arr.filter((_, j) => j !== i)) }} />
            </div>
            {isOpen && def && <div className="list-item-body"><Fields fields={def.fields} value={item} onChange={onChange} base={`${path}.${i}`} focus={focus} /></div>}
          </div>
        )
      })}
      <div className="row-gap wrap-row">
        {field.types.map((t) => <Button key={t.type} size="sm" tone="ghost" icon="plus" onClick={() => { set([...arr, { type: t.type }]); setOpen((s) => new Set(s).add(arr.length)) }}>{t.label}</Button>)}
      </div>
    </div>
  )
}

/** Datalist of every page address, used by all link inputs. */
export function SitePaths() {
  const { site } = useApp()
  if (!site) return null
  const R = { caseStudies: '/work', capabilities: '/capabilities', insights: '/insights', ...(site.site?.routes || {}) }
  const paths = [
    ...site.pages.map((p) => [p.path, p.title]),
    ...site.cases.map((c) => [`${R.caseStudies}/${c.slug}`, plain(c.title)]),
    ...site.capabilities.map((c) => [`${R.capabilities}/${c.slug}`, c.name]),
    ...site.insights.map((c) => [`${R.insights}/${c.slug}`, plain(c.title)]),
  ]
  return <datalist id="site-paths">{paths.map(([p, t]) => <option key={p} value={p}>{t}</option>)}</datalist>
}
