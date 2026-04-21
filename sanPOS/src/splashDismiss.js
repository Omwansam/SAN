/** Minimum time the splash stays visible (ms) — avoids a subliminal flash on fast loads. */
const MIN_VISIBLE_MS = 560
/** Exit animation duration — keep in sync with CSS on #splash-screen */
const EXIT_MS = 420

let dismissed = false

/**
 * Hides the static `#splash-screen` from index.html after the app has mounted.
 * Safe to call multiple times (e.g. React StrictMode).
 */
export function dismissAppSplash() {
  if (dismissed) return
  const splash = document.getElementById('splash-screen')
  if (!splash) {
    dismissed = true
    document.documentElement.classList.remove('splash-active')
    return
  }

  dismissed = true
  const elapsed = performance.now()
  const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)

  window.setTimeout(() => {
    splash.classList.add('splash--exiting')
    splash.setAttribute('aria-hidden', 'true')
    document.documentElement.classList.remove('splash-active')

    window.setTimeout(() => {
      splash.remove()
    }, EXIT_MS)
  }, wait)
}
