import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { getJSON, setJSON } from '../utils/storage'
import { apiRequest } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from './TenantContext'

const KEY = 'customers'

const CustomerContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { customers: action.customers ?? [] }
    case 'SET':
      return { customers: action.customers }
    case 'ADD':
      return { customers: [...state.customers, action.customer] }
    case 'UPDATE':
      return {
        customers: state.customers.map((c) =>
          c.id === action.customer.id ? { ...c, ...action.customer } : c,
        ),
      }
    case 'DELETE':
      return {
        customers: state.customers.filter((c) => c.id !== action.id),
      }
    default:
      return state
  }
}

export function CustomerProvider({ children }) {
  const { tenantId } = useTenant()
  const { currentUser } = useAuth()
  const [state, dispatch] = useReducer(reducer, { customers: [] })

  const loadCustomers = useCallback(async () => {
    if (!tenantId) {
      dispatch({ type: 'HYDRATE', customers: [] })
      return
    }
    const token = currentUser?.token || null
    if (!token) {
      dispatch({ type: 'HYDRATE', customers: getJSON(tenantId, KEY, []) })
      return
    }
    const workspace = `?workspace=${encodeURIComponent(tenantId)}`
    const res = await apiRequest(`/api/customers${workspace}`, { token })
    dispatch({
      type: 'HYDRATE',
      customers: Array.isArray(res?.data) ? res.data : [],
    })
  }, [tenantId, currentUser?.token])

  useEffect(() => {
    loadCustomers().catch(() => {
      if (!tenantId) return
      dispatch({ type: 'HYDRATE', customers: getJSON(tenantId, KEY, []) })
    })
  }, [tenantId, loadCustomers])

  useEffect(() => {
    if (!tenantId) return
    setJSON(tenantId, KEY, state.customers)
  }, [tenantId, state.customers])

  const reloadFromStorage = useCallback(() => loadCustomers(), [loadCustomers])

  const addCustomer = useCallback(
    async (customer) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'ADD', customer })
        return customer
      }
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const res = await apiRequest(`/api/customers${workspace}`, {
        method: 'POST',
        token,
        body: {
          name: customer?.name,
          phone: customer?.phone,
          email: customer?.email,
          loyaltyPoints: customer?.loyaltyPoints,
          totalSpend: customer?.totalSpend,
          tags: customer?.tags,
        },
      })
      const saved = res?.data || customer
      dispatch({ type: 'ADD', customer: saved })
      return saved
    },
    [tenantId, currentUser?.token],
  )

  const updateCustomer = useCallback(
    async (customer) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'UPDATE', customer })
        return customer
      }
      const id = customer?.id
      if (!id) throw new Error('Customer ID is required for update.')
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const res = await apiRequest(`/api/customers/${encodeURIComponent(id)}${workspace}`, {
        method: 'PUT',
        token,
        body: {
          name: customer?.name,
          phone: customer?.phone,
          email: customer?.email,
          loyaltyPoints: customer?.loyaltyPoints,
          totalSpend: customer?.totalSpend,
          tags: customer?.tags,
        },
      })
      const saved = res?.data || customer
      dispatch({ type: 'UPDATE', customer: saved })
      return saved
    },
    [tenantId, currentUser?.token],
  )

  const deleteCustomer = useCallback(
    async (id) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'DELETE', id })
        return
      }
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      await apiRequest(`/api/customers/${encodeURIComponent(id)}${workspace}`, {
        method: 'DELETE',
        token,
      })
      dispatch({ type: 'DELETE', id })
    },
    [tenantId, currentUser?.token],
  )

  const value = useMemo(
    () => ({
      customers: state.customers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      reloadFromStorage,
    }),
    [state.customers, addCustomer, updateCustomer, deleteCustomer, reloadFromStorage],
  )

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomers() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomers must be used within CustomerProvider')
  return ctx
}
