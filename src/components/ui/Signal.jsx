/** The recurring "signal": a small pulsing point. Colour adapts to the world it sits in. */
export default function Signal({ className = '', style }) {
  return <span className={`signal-dot ${className}`} style={style} aria-hidden="true" />
}
