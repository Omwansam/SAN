import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { getJSON, removeJSON, setJSON } from '../utils/storage'
import { canUser } from '../utils/permissions'
import { useTenant } from './TenantContext'

const SESSION_KEY = 'authSession'

const AuthContext = createContext(null)

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user }
    case 'LOGOUT':
      return { ...state, user: null }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const { tenantId } = useTenant()
  const [state, dispatch] = useReducer(authReducer, { user: null })

  useEffect(() => {
    if (!tenantId) {
      dispatch({ type: 'LOGOUT' })
      return
    }
    const session = getJSON(tenantId, SESSION_KEY, null)
    if (session?.id && session?.role) {
      dispatch({ type: 'SET_USER', user: session })
    } else {
      dispatch({ type: 'LOGOUT' })
    }
  }, [tenantId])

  const login = useCallback((user, tenantIdOverride) => {
    const tid = tenantIdOverride ?? tenantId
    if (!tid) return
    const safe = {
      id: user.id,
      name: user.name,
      email: user.email ?? '',
      role: user.role,
    }
    setJSON(tid, SESSION_KEY, safe)
    dispatch({ type: 'SET_USER', user: safe })
  }, [tenantId])

  const logout = useCallback(() => {
    if (tenantId) removeJSON(tenantId, SESSION_KEY)
    dispatch({ type: 'LOGOUT' })
  }, [tenantId])

  const can = useCallback(
    (action) => canUser(state.user?.role, action),
    [state.user],
  )

  const value = useMemo(
    () => ({
      currentUser: state.user,
      role: state.user?.role ?? null,
      login,
      logout,
      can,
      isAuthenticated: Boolean(state.user),
    }),
    [state.user, login, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
