import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { getGlobalJSON, getJSON, setGlobalJSON, setJSON } from '../utils/storage'
import { createDefaultTenantConfig, withTenantDefaults } from '../utils/tenantDefaults'

const CONFIG_KEY = 'config'

const TenantContext = createContext(null)

function tenantReducer(state, action) {
  switch (action.type) {
    case 'SET_TENANT':
      return { ...state, tenantId: action.tenantId }
    case 'SET_CONFIG':
      return { ...state, tenantConfig: action.config }
    case 'MERGE_CONFIG': {
      const base =
        state.tenantConfig || createDefaultTenantConfig(state.tenantId)
      const next = { ...base, ...action.partial, tenantId: state.tenantId }
      return { ...state, tenantConfig: next }
    }
    default:
      return state
  }
}

export function TenantProvider({ children }) {
  const [state, dispatch] = useReducer(tenantReducer, {
    tenantId: null,
    tenantConfig: null,
  })

  useEffect(() => {
    const saved = getGlobalJSON('activeTenantId', null)
    if (saved && typeof saved === 'string') {
      dispatch({ type: 'SET_TENANT', tenantId: saved })
    }
  }, [])

  useEffect(() => {
    if (!state.tenantId) {
      dispatch({ type: 'SET_CONFIG', config: null })
      document.documentElement.style.setProperty('--brand', '#2563eb')
      return
    }
    const raw = getJSON(state.tenantId, CONFIG_KEY, null)
    const normalized = withTenantDefaults(raw, state.tenantId)
    dispatch({
      type: 'SET_CONFIG',
      config: normalized,
    })
    const brand = normalized?.primaryColor || '#2563eb'
    document.documentElement.style.setProperty('--brand', brand)
    setGlobalJSON('activeTenantId', state.tenantId)
  }, [state.tenantId])

  useEffect(() => {
    if (!state.tenantId || !state.tenantConfig) return
    setJSON(state.tenantId, CONFIG_KEY, state.tenantConfig)
    document.documentElement.style.setProperty(
      '--brand',
      state.tenantConfig.primaryColor || '#2563eb',
    )
  }, [state.tenantId, state.tenantConfig])

  const switchTenant = useCallback((tenantId) => {
    dispatch({ type: 'SET_TENANT', tenantId })
  }, [])

  const mergeTenantConfig = useCallback(
    (partial) => {
      if (!state.tenantId) return
      dispatch({ type: 'MERGE_CONFIG', partial })
    },
    [state.tenantId],
  )

  const setTenantConfig = useCallback(
    (config) => {
      if (!state.tenantId) return
      setJSON(state.tenantId, CONFIG_KEY, config)
      dispatch({ type: 'SET_CONFIG', config })
    },
    [state.tenantId],
  )

  const value = useMemo(
    () => ({
      tenantId: state.tenantId,
      tenantConfig: state.tenantConfig,
      switchTenant,
      mergeTenantConfig,
      setTenantConfig,
    }),
    [
      state.tenantId,
      state.tenantConfig,
      switchTenant,
      mergeTenantConfig,
      setTenantConfig,
    ],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
