import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { app } from './store'

/** Runs cb once the page is visibly ready (after splash / curtain). Cleans up on unmount. */
export function useWhenReady(cb, deps = []) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    let out
    const cancel = app.whenReady(() => {
      out = ref.current?.()
    })
    return () => {
      cancel()
      if (typeof out === 'function') out()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function useMedia(query) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
