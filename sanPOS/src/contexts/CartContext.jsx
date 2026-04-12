import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { getJSON, removeJSON, setJSON } from '../utils/storage'
import { useTenant } from './TenantContext'

const DRAFT_KEY = 'draftCart'

const CartContext = createContext(null)

const emptyOrderDiscount = { type: 'none', value: 0 }

function initialState() {
  return {
    items: [],
    activeCustomer: null,
    orderDiscount: { ...emptyOrderDiscount },
    /** Restaurant-style service: delivery | dine_in | takeaway */
    serviceMode: 'delivery',
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return {
        items: action.payload.items ?? [],
        activeCustomer: action.payload.activeCustomer ?? null,
        orderDiscount: action.payload.orderDiscount ?? { ...emptyOrderDiscount },
        serviceMode: action.payload.serviceMode ?? 'delivery',
      }
    case 'ADD_ITEM': {
      const p = action.product
      const line = {
        lineId: crypto.randomUUID(),
        productId: p.id,
        name: p.name,
        qty: Math.max(1, Number(p.qty) || 1),
        unitPrice: Number(p.price) || 0,
        discount: Number(p.discount) || 0,
        discountPercent: Math.min(
          100,
          Math.max(0, Number(p.discountPercent) || 0),
        ),
        note: p.note ?? '',
        controlled: Boolean(p.controlled),
        rxNumber: p.rxNumber ?? '',
        prescriber: p.prescriber ?? '',
        patientDOB: p.patientDOB ?? '',
        deaNumber: p.deaNumber ?? '',
        refillsAuthorized:
          Number(p.refillsAuthorized) >= 0 ? Number(p.refillsAuthorized) : 0,
        refillsRemaining:
          Number(p.refillsRemaining) >= 0 ? Number(p.refillsRemaining) : 0,
        pickupVerified: Boolean(p.pickupVerified),
        pickupIdLast4: p.pickupIdLast4 ?? '',
        kitchenStationId: p.kitchenStationId ?? '',
      }
      return { ...state, items: [...state.items, line] }
    }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map((it) =>
          it.lineId === action.lineId
            ? { ...it, qty: Math.max(1, Number(action.qty) || 1) }
            : it,
        ),
      }
    case 'UPDATE_LINE': {
      const { lineId, patch } = action
      return {
        ...state,
        items: state.items.map((it) =>
          it.lineId === lineId ? { ...it, ...patch } : it,
        ),
      }
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((it) => it.lineId !== action.lineId),
      }
    case 'REMOVE_LINE_IDS': {
      const drop = new Set(action.lineIds ?? [])
      return {
        ...state,
        items: state.items.filter((it) => !drop.has(it.lineId)),
      }
    }
    case 'SET_CUSTOMER':
      return { ...state, activeCustomer: action.customer }
    case 'APPLY_ORDER_DISCOUNT':
      return { ...state, orderDiscount: action.discount }
    case 'SET_SERVICE_MODE':
      return { ...state, serviceMode: action.mode }
    case 'CLEAR':
      return initialState()
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const { tenantId } = useTenant()
  const [state, dispatch] = useReducer(cartReducer, undefined, initialState)

  useEffect(() => {
    if (!tenantId) {
      dispatch({ type: 'CLEAR' })
      return
    }
    const saved = getJSON(tenantId, DRAFT_KEY, null)
    if (saved && Array.isArray(saved.items)) {
      dispatch({ type: 'HYDRATE', payload: saved })
    } else {
      dispatch({ type: 'CLEAR' })
    }
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    const discountEmpty =
      !state.orderDiscount ||
      state.orderDiscount.type === 'none' ||
      Number(state.orderDiscount.value) === 0
    const empty =
      state.items.length === 0 && !state.activeCustomer && discountEmpty
    if (empty) {
      removeJSON(tenantId, DRAFT_KEY)
      return
    }
    setJSON(tenantId, DRAFT_KEY, {
      items: state.items,
      activeCustomer: state.activeCustomer,
      orderDiscount: state.orderDiscount,
      serviceMode: state.serviceMode,
    })
  }, [tenantId, state.items, state.activeCustomer, state.orderDiscount, state.serviceMode])

  const addItem = useCallback((product) => {
    dispatch({ type: 'ADD_ITEM', product })
  }, [])

  const removeItem = useCallback((lineId) => {
    dispatch({ type: 'REMOVE_ITEM', lineId })
  }, [])

  const updateQty = useCallback((lineId, qty) => {
    dispatch({ type: 'UPDATE_QTY', lineId, qty })
  }, [])

  const updateLine = useCallback((lineId, patch) => {
    dispatch({ type: 'UPDATE_LINE', lineId, patch })
  }, [])

  const setActiveCustomer = useCallback((customer) => {
    dispatch({ type: 'SET_CUSTOMER', customer })
  }, [])

  const applyDiscount = useCallback((discount) => {
    dispatch({ type: 'APPLY_ORDER_DISCOUNT', discount })
  }, [])

  const setServiceMode = useCallback((mode) => {
    dispatch({ type: 'SET_SERVICE_MODE', mode })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' })
    if (tenantId) removeJSON(tenantId, DRAFT_KEY)
  }, [tenantId])

  const removeLineIds = useCallback((lineIds) => {
    if (!lineIds?.length) return
    dispatch({ type: 'REMOVE_LINE_IDS', lineIds })
  }, [])

  const value = useMemo(
    () => ({
      items: state.items,
      activeCustomer: state.activeCustomer,
      orderDiscount: state.orderDiscount,
      serviceMode: state.serviceMode,
      addItem,
      removeItem,
      removeLineIds,
      updateQty,
      updateLine,
      setActiveCustomer,
      applyDiscount,
      setServiceMode,
      clearCart,
    }),
    [
      state.items,
      state.activeCustomer,
      state.orderDiscount,
      state.serviceMode,
      addItem,
      removeItem,
      removeLineIds,
      updateQty,
      updateLine,
      setActiveCustomer,
      applyDiscount,
      setServiceMode,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
