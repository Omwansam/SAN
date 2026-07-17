// Capability detection for the Electron desktop shell. The web build never has
// window.posBridge, so every hardware feature must gate on these helpers —
// the same React code serves both targets.

export function isDesktop() {
  return typeof window !== 'undefined' && Boolean(window.posBridge)
}

export function getBridge() {
  return typeof window !== 'undefined' ? (window.posBridge ?? null) : null
}

export function desktopConfig() {
  return getBridge()?.config?.bootstrap ?? null
}

export function hasThermalPrinter() {
  return Boolean(getBridge()?.printer)
}

export function hasCashDrawer() {
  return Boolean(getBridge()?.drawer)
}

export function hasFingerprint() {
  return Boolean(getBridge()?.fingerprint)
}
