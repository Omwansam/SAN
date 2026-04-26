import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { MAIN_BRANCH_ID } from '../utils/defaultBranches'
import { getJSON, setJSON } from '../utils/storage'
import { apiRequest } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { useBranch } from './BranchContext'
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

function branchOfOrder(o) {
  return o.branchId ?? MAIN_BRANCH_ID
}

export function OrderProvider({ children }) {
  const { tenantId } = useTenant()
  const { activeBranchId } = useBranch()
  const { currentUser } = useAuth()
  const [state, dispatch] = useReducer(orderReducer, { orders: [] })

  useEffect(() => {
    let cancelled = false
    async function loadOrders() {
      if (!tenantId) {
        dispatch({ type: 'HYDRATE', orders: [] })
        return
      }
      const token = currentUser?.token || null
      if (!token) {
        dispatch({
          type: 'HYDRATE',
          orders: getJSON(tenantId, ORDERS_KEY, []),
        })
        return
      }
      try {
        const workspace = `?workspace=${encodeURIComponent(tenantId)}`
        const response = await apiRequest(`/api/orders${workspace}`, { token })
        const nextOrders = Array.isArray(response?.data) ? response.data : []
        if (!cancelled) dispatch({ type: 'HYDRATE', orders: nextOrders })
      } catch {
        if (!cancelled) {
          dispatch({
            type: 'HYDRATE',
            orders: getJSON(tenantId, ORDERS_KEY, []),
          })
        }
      }
    }
    loadOrders()
    return () => {
      cancelled = true
    }
  }, [tenantId, currentUser?.token])

  useEffect(() => {
    if (!tenantId) return
    setJSON(tenantId, ORDERS_KEY, state.orders)
  }, [tenantId, state.orders])

  const orders = useMemo(() => {
    if (!activeBranchId) return state.orders
    return state.orders.filter((o) => branchOfOrder(o) === activeBranchId)
  }, [state.orders, activeBranchId])

  const setOrders = useCallback((nextOrders) => {
    dispatch({ type: 'SET_ORDERS', orders: nextOrders })
  }, [])

  const createOrder = useCallback(
    async (order) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        const localOrder = {
          ...order,
          branchId: order.branchId ?? activeBranchId ?? MAIN_BRANCH_ID,
        }
        dispatch({ type: 'ADD_ORDER', order: localOrder })
        return localOrder
      }
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const response = await apiRequest(`/api/orders${workspace}`, {
        method: 'POST',
        token,
        body: order,
      })
      const saved = response?.data || {
        ...order,
        branchId: order.branchId ?? activeBranchId ?? MAIN_BRANCH_ID,
      }
      dispatch({
        type: 'ADD_ORDER',
        order: saved,
      })
      return saved
    },
    [activeBranchId, currentUser?.token, tenantId],
  )

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

  const reloadFromStorage = useCallback(async () => {
    if (!tenantId) return
    const token = currentUser?.token || null
    if (!token) {
      dispatch({
        type: 'HYDRATE',
        orders: getJSON(tenantId, ORDERS_KEY, []),
      })
      return
    }
    try {
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const response = await apiRequest(`/api/orders${workspace}`, { token })
      const nextOrders = Array.isArray(response?.data) ? response.data : []
      dispatch({ type: 'HYDRATE', orders: nextOrders })
    } catch {
      dispatch({
        type: 'HYDRATE',
        orders: getJSON(tenantId, ORDERS_KEY, []),
      })
    }
  }, [tenantId, currentUser?.token])

  const value = useMemo(
    () => ({
      orders,
      allOrders: state.orders,
      setOrders,
      createOrder,
      updateOrder,
      refundOrder,
      reloadFromStorage,
    }),
    [
      orders,
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
