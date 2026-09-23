import { createElement, forwardRef, Fragment } from 'react'

/**
 * Renders text as masked words (or chars) so GSAP can drive entrances.
 * Words: <span.sw><span.si>word</span></span> · Chars: each char in <span.sc>.
 * The plain text stays available to assistive tech via aria-label.
 */
function SplitTextInner({ text, as = 'span', by = 'words', className = '', style, ...rest }, ref) {
  const words = String(text).split(' ')
  const plain = String(text).replace(/\*/g, '')
  let inEm = false
  const kids = words.map((raw, i) => {
    // `*word*` italicises one word; `*several words*` italicises a run
    const opens = raw.startsWith('*')
    const closes = raw.length > 1 && raw.endsWith('*')
    const em = inEm || opens
    const w = raw.replace(/^\*/, '').replace(/\*$/, '')
    if (closes) inEm = false
    else if (opens) inEm = true
    const inner =
      by === 'chars'
        ? Array.from(w).map((c, j) => (
            <span className="sc" key={j} aria-hidden="true">
              {c}
            </span>
          ))
        : w
    return (
      <Fragment key={i}>
        <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          <span className="sw" aria-hidden="true">
            <span className={em ? 'si serif' : 'si'}>{inner}</span>
          </span>
        </span>
        {i < words.length - 1 ? ' ' : null}
      </Fragment>
    )
  })
  return createElement(as, { ref, className, style, 'aria-label': plain, ...rest }, kids)
}

const SplitText = forwardRef(SplitTextInner)
export default SplitText
