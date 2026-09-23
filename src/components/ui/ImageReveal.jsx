import MovingImage from './MovingImage'
/** A MovingImage that always arrives through a directional mask reveal. */
export default function ImageReveal({ reveal = 'up', ...props }) {
  return <MovingImage reveal={reveal} {...props} />
}
