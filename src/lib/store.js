// Tiny cross-component store: splash state, transition readiness.
const state = { splashDone: false, revealQueue: [], busy: false }
const listeners = new Set()

export const app = {
  get splashDone() { return state.splashDone },
  get busy() { return state.busy },
  setSplashDone(v = true) { state.splashDone = v; listeners.forEach((l) => l()) },
  setBusy(v) { state.busy = v },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
  /** Run cb when the page is visibly ready (after curtain lifts / splash ends). Returns cancel fn. */
  whenReady(cb) {
    if (!state.busy && state.splashDone) { const id = requestAnimationFrame(cb); return () => cancelAnimationFrame(id) }
    const item = { cb }
    state.revealQueue.push(item)
    return () => { state.revealQueue = state.revealQueue.filter((i) => i !== item) }
  },
  flush() {
    const q = state.revealQueue; state.revealQueue = []
    q.forEach((i) => i.cb())
  },
}
