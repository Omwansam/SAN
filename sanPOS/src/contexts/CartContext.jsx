import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { MAIN_BRANCH_ID } from '../utils/defaultBranches'
import { getJSON, nsKey, removeJSON, setJSON } from '../utils/storage'
import { useBranch } from './BranchContext'
import { useTenant } from './TenantContext'

const DRAFT_CARTS_KEY = 'draftCarts'
const LEGACY_DRAFT_KEY = 'draftCart'

const CartContext = createContext(null)

const emptyOrderDiscount = { type: 'none', value: 0 }

function emptyDeliveryMeta() {
  return { address: '', phone: '', riderName: '' }
}

function initialState() {
  return {
    items: [],
    activeCustomer: null,
    orderDiscount: { ...emptyOrderDiscount },
    serviceMode: 'delivery',
    deliveryMeta: emptyDeliveryMeta(),
  }
}

function normalizeHydratePayload(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return {
    items: Array.isArray(raw.items) ? raw.items : [],
    activeCustomer: raw.activeCustomer ?? null,
    orderDiscount: raw.orderDiscount ?? { ...emptyOrderDiscount },
    serviceMode: raw.serviceMode ?? 'delivery',
    deliveryMeta: {
      ...emptyDeliveryMeta(),
      ...(raw.deliveryMeta && typeof raw.deliveryMeta === 'object'
        ? raw.deliveryMeta
        : {}),
    },
  }
}

function migrateLegacyDraftCart(tenantId) {
  const legacy = getJSON(tenantId, LEGACY_DRAFT_KEY, null)
  if (!legacy || typeof legacy !== 'object' || !Array.isArray(legacy.items)) return
  let carts = getJSON(tenantId, DRAFT_CARTS_KEY, null)
  if (carts == null || (typeof carts === 'object' && !Array.isArray(carts) && Object.keys(carts).length === 0)) {
    carts = { [MAIN_BRANCH_ID]: normalizeHydratePayload(legacy) }
    setJSON(tenantId, DRAFT_CARTS_KEY, carts)
    removeJSON(tenantId, LEGACY_DRAFT_KEY)
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
        deliveryMeta: action.payload.deliveryMeta ?? emptyDeliveryMeta(),
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
        prescriptionNotes: p.prescriptionNotes ?? '',
        prescriptionImage: p.prescriptionImage ?? '',
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
    case 'SET_DELIVERY_META':
      return {
        ...state,
        deliveryMeta: { ...state.deliveryMeta, ...action.patch },
      }
    case 'CLEAR':
      return initialState()
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const { tenantId } = useTenant()
  const { activeBranchId } = useBranch()
  const [state, dispatch] = useReducer(cartReducer, undefined, initialState)
  const prevBranchRef = useRef(null)
  const branchSnapshotRef = useRef(state)

  useEffect(() => {
    branchSnapshotRef.current = state
  })

  useEffect(() => {
    if (!tenantId) {
      prevBranchRef.current = null
      dispatch({ type: 'CLEAR' })
      return
    }
    migrateLegacyDraftCart(tenantId)
    if (!activeBranchId) return

    if (
      prevBranchRef.current !== null &&
      prevBranchRef.current !== activeBranchId
    ) {
      const allRaw = getJSON(tenantId, DRAFT_CARTS_KEY, {}) || {}
      const all = typeof allRaw === 'object' && !Array.isArray(allRaw) ? { ...allRaw } : {}
      const snap = branchSnapshotRef.current
      const discountEmpty =
        !snap.orderDiscount ||
        snap.orderDiscount.type === 'none' ||
        Number(snap.orderDiscount.value) === 0
      const empty =
        snap.items.length === 0 &&
        !snap.activeCustomer &&
        discountEmpty &&
        !String(snap.deliveryMeta?.address ?? '').trim() &&
        !String(snap.deliveryMeta?.phone ?? '').trim()
      if (!empty) {
        all[prevBranchRef.current] = {
          items: snap.items,
          activeCustomer: snap.activeCustomer,
          orderDiscount: snap.orderDiscount,
          serviceMode: snap.serviceMode,
          deliveryMeta: snap.deliveryMeta,
        }
      } else {
        delete all[prevBranchRef.current]
      }
      setJSON(tenantId, DRAFT_CARTS_KEY, all)
    }

    const allRaw = getJSON(tenantId, DRAFT_CARTS_KEY, {}) || {}
    const all = typeof allRaw === 'object' && !Array.isArray(allRaw) ? allRaw : {}
    const payload = normalizeHydratePayload(all[activeBranchId])
    dispatch({ type: 'HYDRATE', payload })
    prevBranchRef.current = activeBranchId
  }, [tenantId, activeBranchId])

  useEffect(() => {
    if (!tenantId || !activeBranchId) return
    const discountEmpty =
      !state.orderDiscount ||
      state.orderDiscount.type === 'none' ||
      Number(state.orderDiscount.value) === 0
    const empty =
      state.items.length === 0 &&
      !state.activeCustomer &&
      discountEmpty &&
      !String(state.deliveryMeta?.address ?? '').trim() &&
      !String(state.deliveryMeta?.phone ?? '').trim() &&
      !String(state.deliveryMeta?.riderName ?? '').trim()

    const allRaw = getJSON(tenantId, DRAFT_CARTS_KEY, {}) || {}
    const all = typeof allRaw === 'object' && !Array.isArray(allRaw) ? { ...allRaw } : {}

    if (empty) {
      delete all[activeBranchId]
      if (Object.keys(all).length === 0) {
        removeJSON(tenantId, DRAFT_CARTS_KEY)
      } else {
        setJSON(tenantId, DRAFT_CARTS_KEY, all)
      }
      return
    }
    all[activeBranchId] = {
      items: state.items,
      activeCustomer: state.activeCustomer,
      orderDiscount: state.orderDiscount,
      serviceMode: state.serviceMode,
      deliveryMeta: state.deliveryMeta,
    }
    setJSON(tenantId, DRAFT_CARTS_KEY, all)
  }, [
    tenantId,
    activeBranchId,
    state.items,
    state.activeCustomer,
    state.orderDiscount,
    state.serviceMode,
    state.deliveryMeta,
  ])

  useEffect(() => {
    if (!tenantId || !activeBranchId) return
    const draftKey = nsKey(tenantId, DRAFT_CARTS_KEY)
    function onStorage(event) {
      if (event.key !== draftKey) return
      const all =
        event.newValue == null
          ? {}
          : (() => {
              try {
                const parsed = JSON.parse(event.newValue)
                return typeof parsed === 'object' && !Array.isArray(parsed) && parsed ? parsed : {}
              } catch {
                return {}
              }
            })()
      const payload = normalizeHydratePayload(all[activeBranchId])
      dispatch({ type: 'HYDRATE', payload })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [tenantId, activeBranchId])

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

  const setDeliveryMeta = useCallback((patch) => {
    dispatch({ type: 'SET_DELIVERY_META', patch })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' })
    if (tenantId && activeBranchId) {
      const allRaw = getJSON(tenantId, DRAFT_CARTS_KEY, {}) || {}
      const all =
        typeof allRaw === 'object' && !Array.isArray(allRaw) ? { ...allRaw } : {}
      delete all[activeBranchId]
      if (Object.keys(all).length === 0) removeJSON(tenantId, DRAFT_CARTS_KEY)
      else setJSON(tenantId, DRAFT_CARTS_KEY, all)
    }
  }, [tenantId, activeBranchId])

  const removeLineIds = useCallback((lineIds) => {
    if (!lineIds?.length) return
    dispatch({ type: 'REMOVE_LINE_IDS', lineIds })
  }, [])

  const hydrateFromPayload = useCallback((payload) => {
    dispatch({ type: 'HYDRATE', payload: normalizeHydratePayload(payload) })
  }, [])

  const value = useMemo(
    () => ({
      items: state.items,
      activeCustomer: state.activeCustomer,
      orderDiscount: state.orderDiscount,
      serviceMode: state.serviceMode,
      deliveryMeta: state.deliveryMeta,
      addItem,
      removeItem,
      removeLineIds,
      updateQty,
      updateLine,
      setActiveCustomer,
      applyDiscount,
      setServiceMode,
      setDeliveryMeta,
      clearCart,
      hydrateFromPayload,
    }),
    [
      state.items,
      state.activeCustomer,
      state.orderDiscount,
      state.serviceMode,
      state.deliveryMeta,
      addItem,
      removeItem,
      removeLineIds,
      updateQty,
      updateLine,
      setActiveCustomer,
      applyDiscount,
      setServiceMode,
      setDeliveryMeta,
      clearCart,
      hydrateFromPayload,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
