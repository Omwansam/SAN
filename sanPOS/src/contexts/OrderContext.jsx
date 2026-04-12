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

const ORDERS_KEY = 'orders'

const OrderContext = createContext(null)

function orderReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { orders: action.orders ?? [] }
    case 'SET_ORDERS':
      return { orders: action.orders }
    case 'ADD_ORDER':
      return { orders: [action.order, ...state.orders] }
    case 'UPDATE_ORDER':
      return {
        orders: state.orders.map((o) =>
          o.id === action.order.id ? { ...o, ...action.order } : o,
        ),
      }
    default:
      return state
  }
}

export function OrderProvider({ children }) {
  const { tenantId } = useTenant()
  const [state, dispatch] = useReducer(orderReducer, { orders: [] })

  useEffect(() => {
    if (!tenantId) {
      dispatch({ type: 'HYDRATE', orders: [] })
      return
    }
    dispatch({
      type: 'HYDRATE',
      orders: getJSON(tenantId, ORDERS_KEY, []),
    })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    setJSON(tenantId, ORDERS_KEY, state.orders)
  }, [tenantId, state.orders])

  const setOrders = useCallback((orders) => {
    dispatch({ type: 'SET_ORDERS', orders })
  }, [])

  const createOrder = useCallback((order) => {
    dispatch({ type: 'ADD_ORDER', order })
  }, [])

  const updateOrder = useCallback((order) => {
    dispatch({ type: 'UPDATE_ORDER', order })
  }, [])

  const refundOrder = useCallback(
    (orderId, patch = {}) => {
      const target = state.orders.find((o) => o.id === orderId)
      if (!target) return
      updateOrder({
        ...target,
        status: 'refunded',
        ...patch,
      })
    },
    [state.orders, updateOrder],
  )

  const reloadFromStorage = useCallback(() => {
    if (!tenantId) return
    dispatch({
      type: 'HYDRATE',
      orders: getJSON(tenantId, ORDERS_KEY, []),
    })
  }, [tenantId])

  const value = useMemo(
    () => ({
      orders: state.orders,
      setOrders,
      createOrder,
      updateOrder,
      refundOrder,
      reloadFromStorage,
    }),
    [
      state.orders,
      setOrders,
      createOrder,
      updateOrder,
      refundOrder,
      reloadFromStorage,
    ],
  )

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  )
}

export function useOrders() {
  const ctx = useContext(OrderContext)
  if (!ctx) throw new Error('useOrders must be used within OrderProvider')
  return ctx
}
