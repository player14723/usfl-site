import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './ui'
import { DEVICES } from './PreviewFrame'

/** Lets a view put its own controls in the top bar. */
export function TopbarSlot({ children }) {
  const [el, setEl] = useState(null)
  useEffect(() => { setEl(document.getElementById('topbar-slot')) }, [])
  return el ? createPortal(children, el) : null
}

export function DeviceSwitch({ value, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Preview size">
      {Object.entries(DEVICES).map(([k, d]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)} title={`${d.label} (${d.width}px)`}>
          <Icon name={k} size={16} /><span className="sr-only">{d.label}</span>
        </button>
      ))}
    </div>
  )
}

export function ModeSwitch({ value, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Clicking in the preview">
      <button type="button" role="radio" aria-checked={value === 'edit'} className={value === 'edit' ? 'on' : ''} onClick={() => onChange('edit')} title="Click anything on the page to edit it"><Icon name="cursor" size={15} /> Edit</button>
      <button type="button" role="radio" aria-checked={value === 'browse'} className={value === 'browse' ? 'on' : ''} onClick={() => onChange('browse')} title="Links work, so you can move around the site"><Icon name="globe" size={15} /> Browse</button>
    </div>
  )
}
