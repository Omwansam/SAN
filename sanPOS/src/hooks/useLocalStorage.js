import { useCallback, useState } from 'react'

/**
 * Sync state with localStorage for a full key string (caller handles namespacing).
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @returns {[T, (value: T | ((prev: T) => T)) => void]}
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return initialValue
      return JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  const setStored = useCallback(
    (next) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? next(prev) : next
        try {
          if (v === undefined) window.localStorage.removeItem(key)
          else window.localStorage.setItem(key, JSON.stringify(v))
        } catch {
          /* quota / private mode */
        }
        return v
      })
    },
    [key],
  )

  return [value, setStored]
}
