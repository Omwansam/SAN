import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { getJSON, setJSON } from '../utils/storage'
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
  const [state, dispatch] = useReducer(reducer, { customers: [] })

  useEffect(() => {
    if (!tenantId) {
      dispatch({ type: 'HYDRATE', customers: [] })
      return
    }
    dispatch({ type: 'HYDRATE', customers: getJSON(tenantId, KEY, []) })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    setJSON(tenantId, KEY, state.customers)
  }, [tenantId, state.customers])

  const reloadFromStorage = useCallback(() => {
    if (!tenantId) return
    dispatch({ type: 'HYDRATE', customers: getJSON(tenantId, KEY, []) })
  }, [tenantId])

  const addCustomer = useCallback((customer) => {
    dispatch({ type: 'ADD', customer })
  }, [])

  const updateCustomer = useCallback((customer) => {
    dispatch({ type: 'UPDATE', customer })
  }, [])

  const deleteCustomer = useCallback((id) => {
    dispatch({ type: 'DELETE', id })
  }, [])

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
