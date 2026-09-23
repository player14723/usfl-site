import { forwardRef } from 'react'
import { useGo } from '../PageTransition'
import { hrefFor } from '../../lib/router'

/** Internal link that plays the connected page transition. `shared` turns the card's image into the next hero. */
const TLink = forwardRef(function TLink({ to, children, className = '', onClick, shared = false, ...rest }, ref) {
  const go = useGo()
  const handle = (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    onClick?.(e)
    const img = shared ? e.currentTarget.querySelector('[data-shared-img]') : null
    go(to, { sharedEl: img })
  }
  return (
    <a ref={ref} href={hrefFor(to)} className={className} onClick={handle} {...rest}>
      {children}
    </a>
  )
})
export default TLink
