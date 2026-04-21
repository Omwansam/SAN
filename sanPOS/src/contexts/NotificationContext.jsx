import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import toast from 'react-hot-toast'
import { getJSON, setJSON } from '../utils/storage'
import { useTenant } from './TenantContext'

const PANEL_KEY = 'notifications'

const NotificationContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { items: action.items ?? [] }
    default:
      return state
  }
}

export function NotificationProvider({ children }) {
  const { tenantId } = useTenant()
  const [state, dispatch] = useReducer(reducer, { items: [] })

  useEffect(() => {
    if (!tenantId) {
      dispatch({ type: 'HYDRATE', items: [] })
      return
    }
    const raw = getJSON(tenantId, PANEL_KEY, [])
    dispatch({ type: 'HYDRATE', items: Array.isArray(raw) ? raw : [] })
  }, [tenantId])

  const pushNotification = useCallback(
    ({
      level = 'info',
      title,
      message,
      toast: showToast = true,
    }) => {
      if (!tenantId) return
      const item = {
        id: crypto.randomUUID(),
        level,
        title,
        message,
        createdAt: new Date().toISOString(),
      }
      const prev = getJSON(tenantId, PANEL_KEY, [])
      const list = Array.isArray(prev) ? prev : []
      const next = [item, ...list].slice(0, 200)
      setJSON(tenantId, PANEL_KEY, next)
      dispatch({ type: 'HYDRATE', items: next })
      if (showToast) {
        const t = title || message || 'Notice'
        if (level === 'error') toast.error(t)
        else if (level === 'success') toast.success(t)
        else toast(t)
      }
    },
    [tenantId],
  )

  const dismissNotification = useCallback(
    (id) => {
      if (!tenantId) return
      const prev = getJSON(tenantId, PANEL_KEY, [])
      const list = Array.isArray(prev) ? prev : []
      const next = list.filter((x) => x.id !== id)
      setJSON(tenantId, PANEL_KEY, next)
      dispatch({ type: 'HYDRATE', items: next })
    },
    [tenantId],
  )

  const clearNotifications = useCallback(() => {
    if (!tenantId) return
    setJSON(tenantId, PANEL_KEY, [])
    dispatch({ type: 'HYDRATE', items: [] })
  }, [tenantId])

  const value = useMemo(
    () => ({
      notifications: state.items,
      pushNotification,
      dismissNotification,
      clearNotifications,
    }),
    [state.items, pushNotification, dismissNotification, clearNotifications],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx)
    throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
