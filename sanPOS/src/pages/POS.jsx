import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import * as Switch from '@radix-ui/react-switch'
import { Camera, Monitor, Pause, Play, ShoppingBag } from 'lucide-react'
import { MobileCartDrawer } from '../components/layout/MobileCartDrawer'
import { CartPanel } from '../components/pos/CartPanel'
import {
  CustomPosLayout,
  GroceryPosLayout,
  LaundryPosLayout,
  LiquorPosLayout,
  PharmacyPosLayout,
  RestaurantPosLayout,
  RetailPosLayout,
  SalonPosLayout,
} from '../components/pos/layouts/PosExperienceLayouts'
import { BarcodeScannerModal } from '../components/pos/BarcodeScannerModal'
import { ManagerPinModal } from '../components/pos/ManagerPinModal'
import { PaymentModal } from '../components/pos/PaymentModal'
import { ProductGrid } from '../components/pos/ProductGrid'
import { RecentOrdersStrip } from '../components/pos/RecentOrdersStrip'
import { ReceiptModal } from '../components/pos/ReceiptModal'
import { SplitBillModal } from '../components/pos/SplitBillModal'
import { getPosExperience } from '../config/posExperience'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useAuth } from '../hooks/useAuth'
import { useBranch } from '../hooks/useBranch'
import { useCart } from '../hooks/useCart'
import { useCustomers } from '../hooks/useCustomers'
import { useOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { useNotifications } from '../hooks/useNotifications'
import { useCustomerDisplayRegisterOnline } from '../hooks/useCustomerDisplayRegisterOnline'
import { useTenant } from '../hooks/useTenant'
import { appendDispensingEntry } from '../utils/dispensingLog'
import { buildEqualSplitRowsWithTips } from '../utils/paymentSplit'
import {
  computeCartTotals,
  lineDiscountAmount,
  lineNet,
} from '../utils/posTotals'
import { formatCurrency } from '../utils/currency'
import { validateRxCartLines } from '../utils/rxValidation'
import { apiRequest } from '../utils/api'
import { appendStockLog } from '../utils/stockLog'
import { postCustomerDisplayMessage } from '../utils/customerDisplayChannel'
import { getJSON, setJSON } from '../utils/storage'
import { newId } from '../utils/uuid'

const POS_LAYOUTS = {
  retail: RetailPosLayout,
  grocery: GroceryPosLayout,
  pharmacy: PharmacyPosLayout,
  restaurant: RestaurantPosLayout,
  salon: SalonPosLayout,
  laundry: LaundryPosLayout,
  liquor: LiquorPosLayout,
  custom: CustomPosLayout,
}

export default function POS() {
  const navigate = useNavigate()
  const { tenantId, tenantConfig } = useTenant()
  const { online: customerDisplayRegisterOnline, publish: publishCustomerDisplayRegisterOnline } =
    useCustomerDisplayRegisterOnline(tenantId)
  const { activeBranchId, activeBranch } = useBranch()
  const { currentUser, can } = useAuth()
  const { products, categories, updateProduct } = useProducts()
  const { createOrder, reloadFromStorage: reloadOrders } = useOrders()
  const { customers, addCustomer, updateCustomer } = useCustomers()
  const { pushNotification } = useNotifications()
  const {
    items,
    activeCustomer,
    orderDiscount,
    addItem,
    removeItem,
    removeLineIds,
    updateQty,
    updateLine,
    setActiveCustomer,
    applyDiscount,
    clearCart,
    serviceMode,
    deliveryMeta,
    setDeliveryMeta,
    hydrateFromPayload,
  } = useCart()

  const searchRef = useRef(null)
  const mgrOkRef = useRef(false)
  const payContinueRef = useRef(null)
  const [mgrOpen, setMgrOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanContinuous, setScanContinuous] = useState(false)
  const [scanMissingCode, setScanMissingCode] = useState(null)
  const [heldOpen, setHeldOpen] = useState(false)

  const [payOpen, setPayOpen] = useState(false)
  const [rcOpen, setRcOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [custQ, setCustQ] = useState('')
  const [drawer, setDrawer] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  /** When set, checkout only these cart line IDs (split bill). */
  const [partialLineIds, setPartialLineIds] = useState(null)
  const [payNonce, setPayNonce] = useState(0)
  const [paySplitRows, setPaySplitRows] = useState(null)
  const [payInitialMode, setPayInitialMode] = useState('single')
  /** When using split + tips, total collected can exceed merchandise `totals.total`. */
  const [payOrderTotal, setPayOrderTotal] = useState(null)
  const [payTipsTotal, setPayTipsTotal] = useState(0)

  const pos = useMemo(() => getPosExperience(tenantConfig), [tenantConfig])
  const PosLayout = POS_LAYOUTS[pos.layoutKey] ?? RetailPosLayout

  const bumpPayModal = useCallback(() => {
    setPayNonce((n) => n + 1)
  }, [])

  const payItems = useMemo(() => {
    if (!partialLineIds?.length) return items
    const set = new Set(partialLineIds)
    return items.filter((it) => set.has(it.lineId))
  }, [items, partialLineIds])

  useEffect(() => {
    if (items.length === 0) mgrOkRef.current = false
  }, [items.length])

  const setScanOpenWithReset = useCallback((open) => {
    if (!open) setScanContinuous(false)
    setScanOpen(open)
  }, [])

  const openCustomerDisplay = useCallback(() => {
    const url = new URL('/customer-display', window.location.origin).href
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) {
      toast.error('Pop-up blocked. Allow pop-ups to open customer display.')
      return
    }
    w.focus?.()
  }, [])

  const deliveryFeeOpts = useMemo(() => {
    const fee = Number(tenantConfig?.deliveryFee) || 0
    const isRest = tenantConfig?.businessType === 'restaurant'
    const include =
      isRest &&
      serviceMode === 'delivery' &&
      !partialLineIds?.length &&
      fee > 0
    return { deliveryFee: fee, includeDeliveryFee: include }
  }, [
    tenantConfig?.deliveryFee,
    tenantConfig?.businessType,
    serviceMode,
    partialLineIds,
  ])

  const totals = useMemo(
    () =>
      computeCartTotals(
        payItems,
        orderDiscount,
        tenantConfig?.taxRate ?? 0,
        deliveryFeeOpts,
      ),
    [payItems, orderDiscount, tenantConfig?.taxRate, deliveryFeeOpts],
  )

  const paymentDue = payOrderTotal ?? totals.total

  const businessLabel = useMemo(() => {
    const t = tenantConfig?.businessType
    const map = {
      retail: 'Retail',
      grocery: 'Grocery',
      pharmacy: 'Pharmacy',
      restaurant: 'Restaurant',
      salon: 'Salon / spa',
      laundry: 'Laundry',
      liquor: 'Liquor store',
      custom: 'Custom',
    }
    return map[t] || 'POS'
  }, [tenantConfig?.businessType])

  const catalogStatsLine = useMemo(() => {
    const n = products.filter((p) => p.active !== false).length
    const c = categories.length
    return `${n} product${n === 1 ? '' : 's'} · ${c} categor${c === 1 ? 'y' : 'ies'}`
  }, [products, categories])

  const custFiltered = useMemo(() => {
    const s = custQ.trim().toLowerCase()
    if (!s) return customers.slice(0, 8)
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        String(c.phone ?? '').includes(s) ||
        String(c.email ?? '').toLowerCase().includes(s),
    )
  }, [customers, custQ])

  const onAdd = useCallback(
    (p) => {
      addItem({
        id: p.id,
        name: p.name,
        price: p.price,
        qty: p.qty ?? 1,
        discount: p.discount ?? 0,
        note: p.note ?? '',
        controlled: Boolean(p.controlled),
        kitchenStationId: p.kitchenStationId ?? '',
        prescriber: p.prescriber ?? '',
        prescriptionNotes: p.prescriptionNotes ?? '',
        prescriptionImage: p.prescriptionImage ?? '',
      })
    },
    [addItem],
  )

  const addOrIncrementProduct = useCallback(
    (p) => {
      const existing = items.find((it) => it.productId === p.id)
      if (existing) {
        updateQty(existing.lineId, existing.qty + 1)
      } else {
        onAdd({ ...p, qty: 1 })
      }
    },
    [items, updateQty, onAdd],
  )

  const handleBarcodeDetected = useCallback(
    (raw) => {
      const code = String(raw ?? '').trim()
      if (!code) return
      const active = products.filter((p) => p.active !== false)
      const byBarcode = active.find((x) => String(x.barcode ?? '').trim() === code)
      const bySku = active.find(
        (x) =>
          String(x.sku ?? '').trim() &&
          String(x.sku ?? '').trim().toLowerCase() === code.toLowerCase(),
      )
      const p = byBarcode || bySku
      if (!p) {
        setScanMissingCode(code)
        setScanOpenWithReset(false)
        return
      }
      addOrIncrementProduct(p)
      toast.success(`Added ${p.name}`)
      if (!scanContinuous) setScanOpenWithReset(false)
    },
    [products, addOrIncrementProduct, scanContinuous, setScanOpenWithReset],
  )

  const runOpenPaymentModal = useCallback(() => {
    setDrawer(false)
    setPartialLineIds(null)
    setPaySplitRows(null)
    setPayInitialMode('single')
    setPayOrderTotal(null)
    setPayTipsTotal(0)
    bumpPayModal()
    setPayOpen(true)
  }, [bumpPayModal])

  const openFullPay = useCallback(() => {
    const lines = partialLineIds?.length
      ? items.filter((it) => new Set(partialLineIds).has(it.lineId))
      : items
    const needMgr = Boolean(
      tenantConfig?.modules?.prescriptions &&
        lines.some((it) => it.controlled) &&
        !can('controlled_substance') &&
        !mgrOkRef.current,
    )
    if (needMgr) {
      payContinueRef.current = runOpenPaymentModal
      setMgrOpen(true)
      toast('Manager PIN required for controlled sale.')
      return
    }
    runOpenPaymentModal()
  }, [
    runOpenPaymentModal,
    items,
    partialLineIds,
    tenantConfig?.modules?.prescriptions,
    can,
  ])

  const commitSearch = useCallback(
    (s) => {
      const active = products.filter((p) => p.active !== false)
      const byBarcode = active.find(
        (p) => String(p.barcode ?? '').trim() && String(p.barcode) === s,
      )
      const bySku = active.find((p) => String(p.sku ?? '').toLowerCase() === s)
      const byName = active.find((p) => p.name.toLowerCase().includes(s))
      const p = byBarcode || bySku || byName
      if (!p) {
        toast.error('No matching product.')
        return
      }
      addOrIncrementProduct(p)
    },
    [products, addOrIncrementProduct],
  )

  useEffect(() => {
    function onKey(e) {
      if (e.target?.closest?.('[role="dialog"]')) return
      if (e.code === 'F2') {
        e.preventDefault()
        searchRef.current?.focus?.()
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        if (items.length) openFullPay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items.length, openFullPay])

  const holdCart = useCallback(() => {
    if (!tenantId || !activeBranchId || !items.length) {
      toast.error('Nothing to hold.')
      return
    }
    const held = getJSON(tenantId, 'heldCarts', [])
    const list = Array.isArray(held) ? held : []
    const snapshot = {
      items,
      activeCustomer,
      orderDiscount,
      serviceMode,
      deliveryMeta,
    }
    list.unshift({
      id: newId(),
      branchId: activeBranchId,
      createdAt: new Date().toISOString(),
      snapshot,
    })
    setJSON(tenantId, 'heldCarts', list.slice(0, 25))
    clearCart()
    toast.success('Cart held')
  }, [
    tenantId,
    activeBranchId,
    items,
    activeCustomer,
    orderDiscount,
    serviceMode,
    deliveryMeta,
    clearCart,
  ])

  const resumeHeld = useCallback(
    (row) => {
      if (!row?.snapshot) return
      hydrateFromPayload(row.snapshot)
      setHeldOpen(false)
      toast.success('Cart restored')
    },
    [hydrateFromPayload],
  )

  const completePay = useCallback(
    async ({ payments, change }) => {
      if (!tenantId || !tenantConfig || !currentUser) return
      if (!payItems.length) {
        toast.error('Nothing to pay.')
        return
      }
      const rxCheck = validateRxCartLines(payItems, tenantConfig)
      if (!rxCheck.ok) {
        for (const err of rxCheck.errors) toast.error(err)
        return
      }
      const registerId = getJSON(tenantId, 'activeRegisterId', 'default')
      const t = computeCartTotals(
        payItems,
        orderDiscount,
        tenantConfig.taxRate ?? 0,
        {
          deliveryFee: Number(tenantConfig.deliveryFee) || 0,
          includeDeliveryFee:
            tenantConfig.businessType === 'restaurant' &&
            serviceMode === 'delivery' &&
            !partialLineIds?.length &&
            (Number(tenantConfig.deliveryFee) || 0) > 0,
        },
      )
      const orderItems = payItems.map((it) => {
        const line = lineNet(it)
        const ratio = t.taxableBase > 0 ? line / t.taxableBase : 0
        return {
          productId: it.productId,
          name: it.name,
          qty: it.qty,
          unitPrice: it.unitPrice,
          discount: lineDiscountAmount(it),
          discountPercent: Number(it.discountPercent) || 0,
          tax: t.taxAmount * ratio,
          total: line,
          rxNumber: it.rxNumber?.trim() || undefined,
          prescriber: it.prescriber?.trim() || undefined,
          patientDOB: it.patientDOB?.trim() || undefined,
          controlled: Boolean(it.controlled),
          deaNumber: it.deaNumber?.trim() || undefined,
          refillsAuthorized: Number(it.refillsAuthorized) || 0,
          refillsRemaining: Number(it.refillsRemaining) || 0,
          pickupVerified: Boolean(it.pickupVerified),
          pickupIdLast4: it.pickupIdLast4?.trim() || undefined,
          prescriptionNotes: it.prescriptionNotes?.trim() || undefined,
          prescriptionImage: it.prescriptionImage || undefined,
        }
      })
      const restaurantService =
        tenantConfig?.businessType === 'restaurant'
          ? {
              serviceMode,
              serviceModeLabel:
                serviceMode === 'delivery'
                  ? 'Delivery'
                  : serviceMode === 'dine_in'
                    ? 'Dine in'
                    : 'Takeaway',
            }
          : {}

      const deliveryPatch =
        tenantConfig.modules?.deliveries && serviceMode === 'delivery'
          ? {
              deliveryAddress: deliveryMeta?.address?.trim() || undefined,
              deliveryPhone: deliveryMeta?.phone?.trim() || undefined,
              deliveryRider: deliveryMeta?.riderName?.trim() || undefined,
            }
          : {}

      const firstPayment = Array.isArray(payments) && payments.length > 0 ? payments[0] : null
      const orderPayload = {
        tenantId,
        branchId: activeBranchId ?? undefined,
        registerId,
        cashierId: currentUser.id,
        customerId: activeCustomer?.id ?? null,
        customerName: activeCustomer?.name ?? undefined,
        items: orderItems,
        subtotal: t.subtotal,
        taxAmount: t.taxAmount,
        taxableBase: t.taxableBase,
        notes: '',
        ...(orderDiscount?.discountId ? { discountId: orderDiscount.discountId } : {}),
        ...(orderDiscount?.discountCode ? { discountCode: orderDiscount.discountCode } : {}),
        ...(firstPayment
          ? {
              payment: {
                method: firstPayment.method || 'cash',
                amount: Number(firstPayment.amount || t.total) || t.total,
                paymentStatus: 'paid',
                reference: firstPayment.reference || null,
              },
            }
          : {}),
        ...restaurantService,
        ...deliveryPatch,
      }
      let order = null
      try {
        order = await createOrder(orderPayload)
        await reloadOrders()
      } catch (error) {
        toast.error(error.message || 'Failed to create order on backend.')
        return
      }

      if (tenantConfig.modules?.inventory) {
        for (const it of payItems) {
          const pr = products.find((x) => x.id === it.productId)
          if (pr) {
            const nextStock = Math.max(0, (pr.stock ?? 0) - it.qty)
            void updateProduct({
              ...pr,
              stock: nextStock,
            }).catch(() => {})
            if (currentUser?.token) {
              const workspace = `?workspace=${encodeURIComponent(tenantId)}`
              apiRequest(`/api/stock${workspace}`, {
                method: 'POST',
                token: currentUser.token,
                body: {
                  branchId: activeBranchId,
                  productId: pr.id,
                  productName: pr.name,
                  delta: -it.qty,
                  reason: 'sale',
                  userId: currentUser.id,
                },
              }).catch(() => {})
            } else {
              appendStockLog(tenantId, {
                branchId: activeBranchId,
                productId: pr.id,
                productName: pr.name,
                delta: -it.qty,
                reason: 'sale',
                userId: currentUser.id,
              })
            }
          }
        }
      }

      if (tenantConfig.modules?.loyalty && activeCustomer?.id) {
        const c = customers.find((x) => x.id === activeCustomer.id)
        if (c) {
          const spendBase = t.total
          void updateCustomer({
            ...c,
            loyaltyPoints: (c.loyaltyPoints ?? 0) + Math.floor(spendBase / 100),
            totalSpend: (c.totalSpend ?? 0) + spendBase,
          }).catch(() => {})
        }
      }

      if (pos.sendToKitchenOnSale) {
        const q = getJSON(tenantId, 'kitchenQueue', [])
        const stations = tenantConfig.kitchenStations
        const defaultStation = stations?.[0]?.id ?? 'hot'
        q.push({
          id: newId(),
          orderId: order?.id || newId(),
          branchId: activeBranchId ?? undefined,
          status: 'preparing',
          items: payItems.map((cartIt) => {
            const line = lineNet(cartIt)
            const ratio = t.taxableBase > 0 ? line / t.taxableBase : 0
            const pr = products.find((x) => x.id === cartIt.productId)
            const stationId =
              cartIt.kitchenStationId ||
              pr?.kitchenStationId ||
              defaultStation
            return {
              lineKey: cartIt.lineId,
              productId: cartIt.productId,
              name: cartIt.name,
              qty: cartIt.qty,
              unitPrice: cartIt.unitPrice,
              discount: lineDiscountAmount(cartIt),
              tax: t.taxAmount * ratio,
              total: line,
              prepStatus: 'queued',
              stationId,
            }
          }),
          createdAt: order?.createdAt || new Date().toISOString(),
        })
        setJSON(tenantId, 'kitchenQueue', q)
      }

      if (tenantConfig.modules?.prescriptions) {
        const disp = payItems.filter(
          (it) =>
            it.controlled ||
            String(it.rxNumber ?? '').trim() ||
            String(it.prescriber ?? '').trim(),
        )
        if (disp.length) {
          appendDispensingEntry(tenantId, {
            orderId: order.id,
            cashierId: currentUser.id,
            customerId: activeCustomer?.id ?? null,
            lines: disp.map((it) => ({
              name: it.name,
              qty: it.qty,
              rxNumber: it.rxNumber,
              prescriber: it.prescriber,
              patientDOB: it.patientDOB,
              controlled: Boolean(it.controlled),
              deaNumber: it.deaNumber,
              refillsAuthorized: it.refillsAuthorized,
              refillsRemaining: it.refillsRemaining,
              pickupVerified: Boolean(it.pickupVerified),
              pickupIdLast4: it.pickupIdLast4,
            })),
          })
        }
      }

      setLastOrder(order)
      postCustomerDisplayMessage({
        type: 'sale_complete',
        total: t.total,
        partial: Boolean(partialLineIds?.length),
        at: new Date().toISOString(),
      })
      if (partialLineIds?.length) {
        removeLineIds(partialLineIds)
      } else {
        clearCart()
      }
      setPartialLineIds(null)
      setPaySplitRows(null)
      setPayInitialMode('single')
      setPayOrderTotal(null)
      setPayTipsTotal(0)
      setPayOpen(false)
      setRcOpen(true)
      mgrOkRef.current = false
      pushNotification({
        level: 'success',
        title: partialLineIds?.length ? 'Partial payment' : 'Sale completed',
        message: formatCurrency(t.total, tenantConfig),
        toast: true,
      })
      toast.success(partialLineIds?.length ? 'Partial payment recorded' : 'Sale completed')
    },
    [
      tenantId,
      tenantConfig,
      currentUser,
      payItems,
      orderDiscount,
      activeCustomer,
      products,
      customers,
      createOrder,
      reloadOrders,
      updateProduct,
      updateCustomer,
      clearCart,
      removeLineIds,
      partialLineIds,
      payTipsTotal,
      pos.sendToKitchenOnSale,
      serviceMode,
      activeBranchId,
      deliveryMeta,
      pushNotification,
    ],
  )

  const validateDiscountCode = useCallback(
    async (code) => {
      if (!tenantId || !currentUser?.token) {
        return { ok: false, error: 'Login required to validate discount code.' }
      }
      const subtotal = computeCartTotals(
        items,
        { type: 'none', value: 0 },
        tenantConfig?.taxRate ?? 0,
        deliveryFeeOpts,
      ).subtotal

      try {
        const workspace = `?workspace=${encodeURIComponent(tenantId)}`
        const response = await apiRequest(`/api/discounts/validate${workspace}`, {
          method: 'POST',
          token: currentUser.token,
          body: {
            code,
            subtotal,
            requireActive: true,
          },
        })
        const payload = response?.data
        if (!payload?.eligible) {
          const reason = payload?.reasons?.[0] || 'Discount is not eligible for this cart.'
          return { ok: false, error: reason }
        }
        applyDiscount({
          type: payload.discount.type,
          value: Number(payload.discount.value) || 0,
          discountId: payload.discount.id,
          discountCode: payload.discount.code || code,
        })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error.message || 'Could not validate discount code.' }
      }
    },
    [tenantId, currentUser?.token, items, tenantConfig?.taxRate, deliveryFeeOpts, applyDiscount],
  )

  const selectCustomer = useCallback(
    (c) => {
      if (String(c.id).startsWith('walkin-')) {
        const nc = {
          ...c,
          id: newId(),
          tenantId,
          loyaltyPoints: 0,
          totalSpend: 0,
          createdAt: new Date().toISOString(),
          tags: [],
        }
        void addCustomer(nc).catch(() => {})
        setActiveCustomer(nc)
      } else {
        setActiveCustomer(c)
      }
      setCustQ('')
    },
    [addCustomer, setActiveCustomer, tenantId],
  )

  const onPaySelectedLines = useCallback(
    (lineIds) => {
      setPartialLineIds(lineIds)
      setPaySplitRows(null)
      setPayInitialMode('single')
      setPayOrderTotal(null)
      setPayTipsTotal(0)
      const subset = items.filter((it) => lineIds.includes(it.lineId))
      const needMgr = Boolean(
        tenantConfig?.modules?.prescriptions &&
          subset.some((it) => it.controlled) &&
          !can('controlled_substance') &&
          !mgrOkRef.current,
      )
      if (needMgr) {
        payContinueRef.current = () => {
          bumpPayModal()
          setPayOpen(true)
        }
        setMgrOpen(true)
        toast('Manager PIN required for controlled sale.')
        return
      }
      bumpPayModal()
      setPayOpen(true)
    },
    [bumpPayModal, items, tenantConfig?.modules?.prescriptions, can],
  )

  const onEqualSplitWithTips = useCallback(
    (parts, tipByParty) => {
      const methods = tenantConfig?.paymentMethods ?? ['cash']
      const m0 = methods[0] ?? 'cash'
      const fullTotals = computeCartTotals(
        items,
        orderDiscount,
        tenantConfig?.taxRate ?? 0,
        {
          deliveryFee: Number(tenantConfig?.deliveryFee) || 0,
          includeDeliveryFee:
            tenantConfig?.businessType === 'restaurant' &&
            serviceMode === 'delivery' &&
            (Number(tenantConfig?.deliveryFee) || 0) > 0,
        },
      )
      const { rows, grandTotal, tipsTotal } = buildEqualSplitRowsWithTips(
        fullTotals.total,
        parts,
        tipByParty,
        m0,
      )
      setPartialLineIds(null)
      setPaySplitRows(rows)
      setPayInitialMode('split')
      setPayOrderTotal(grandTotal)
      setPayTipsTotal(tipsTotal)
      const needMgr = Boolean(
        tenantConfig?.modules?.prescriptions &&
          items.some((it) => it.controlled) &&
          !can('controlled_substance') &&
          !mgrOkRef.current,
      )
      if (needMgr) {
        payContinueRef.current = () => {
          bumpPayModal()
          setPayOpen(true)
        }
        setMgrOpen(true)
        toast('Manager PIN required for controlled sale.')
        return
      }
      bumpPayModal()
      setPayOpen(true)
    },
    [bumpPayModal, items, orderDiscount, tenantConfig, serviceMode, can],
  )

  const cartTotals = useMemo(
    () =>
      computeCartTotals(
        items,
        orderDiscount,
        tenantConfig?.taxRate ?? 0,
        deliveryFeeOpts,
      ),
    [items, orderDiscount, tenantConfig?.taxRate, deliveryFeeOpts],
  )

  const cartPanelProps = {
    tenantConfig,
    items,
    activeCustomer,
    orderDiscount,
    totals: cartTotals,
    products,
    customers: custFiltered,
    customerQuery: custQ,
    onCustomerQuery: setCustQ,
    onSelectCustomer: selectCustomer,
    onClearCustomer: () => setActiveCustomer(null),
    onOrderDiscount: applyDiscount,
    onValidateDiscountCode: validateDiscountCode,
    onQty: updateQty,
    onRemove: removeItem,
    onUpdateLine: updateLine,
    onPay: openFullPay,
    onOpenSplit: () => {
      setDrawer(false)
      setSplitOpen(true)
    },
    showSplitBill: pos.supportsTableSplit,
  }

  const cartNode = <CartPanel {...cartPanelProps} variant="sidebar" />
  const mobileCartNode = <CartPanel {...cartPanelProps} variant="drawer" />

  const posToolbar = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="!py-1.5 text-xs" onClick={holdCart}>
          <Pause className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Hold cart
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!py-1.5 text-xs"
          onClick={() => setHeldOpen(true)}
        >
          <Play className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Resume
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!py-1.5 text-xs"
          onClick={() => {
            if (items.length && !window.confirm('Clear the cart?')) return
            clearCart()
          }}
        >
          Clear cart
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!py-1.5 text-xs"
          onClick={() => setScanOpenWithReset(true)}
        >
          <Camera className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Scan barcode
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!py-1.5 text-xs"
          onClick={openCustomerDisplay}
        >
          <Monitor className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Customer screen
        </Button>
        <div className="flex w-full flex-wrap items-center gap-2.5 rounded-xl border border-gray-200/90 bg-white/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/55 sm:w-auto sm:items-center">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${customerDisplayRegisterOnline ? 'bg-emerald-500' : 'bg-red-500'}`}
            aria-hidden
          />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            Customer display
          </span>
          <Switch.Root
            checked={customerDisplayRegisterOnline}
            onCheckedChange={(v) => publishCustomerDisplayRegisterOnline(v)}
            disabled={!tenantId}
            className="h-6 w-11 shrink-0 rounded-full bg-gray-200 data-[state=checked]:bg-emerald-600 dark:bg-gray-600 dark:data-[state=checked]:bg-emerald-600"
            aria-label="Customer display online for second screen"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
          </Switch.Root>
          <span
            className={`text-xs font-semibold ${customerDisplayRegisterOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {customerDisplayRegisterOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          F2 search · Enter add match · Ctrl+Enter pay
        </span>
      </div>
      {tenantConfig?.modules?.deliveries && serviceMode === 'delivery' ? (
        <div className="mt-3 grid gap-2 rounded-2xl border border-gray-200/80 bg-white/80 p-3 dark:border-gray-800 dark:bg-gray-900/80 sm:grid-cols-3">
          <Input
            label="Delivery address"
            value={deliveryMeta?.address ?? ''}
            onChange={(e) =>
              setDeliveryMeta({ address: e.target.value })
            }
          />
          <Input
            label="Delivery phone"
            value={deliveryMeta?.phone ?? ''}
            onChange={(e) => setDeliveryMeta({ phone: e.target.value })}
          />
          <Input
            label="Rider name"
            value={deliveryMeta?.riderName ?? ''}
            onChange={(e) =>
              setDeliveryMeta({ riderName: e.target.value })
            }
          />
        </div>
      ) : null}
    </>
  )

  const gridSection = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <section className="flex min-h-[420px] flex-1 flex-col rounded-3xl border border-gray-200/80 bg-[var(--surface-elevated)] p-3 shadow-[var(--surface-card-shadow)] dark:border-gray-800/80 dark:bg-gray-900/95 lg:min-h-[calc(100vh-11rem)] lg:min-h-0 lg:p-5">
        <ProductGrid
          ref={searchRef}
          products={products}
          categories={categories}
          tenantConfig={tenantConfig}
          showStock={Boolean(tenantConfig?.modules?.inventory)}
          statsLine={catalogStatsLine}
          onAddProduct={onAdd}
          onCommitSearch={commitSearch}
        />
      </section>
      {tenantConfig?.businessType === 'restaurant' ? <RecentOrdersStrip /> : null}
    </div>
  )

  const cartSection = (
    <section className="hidden h-full min-h-0 w-full shrink-0 flex-col bg-transparent p-0 pl-2 shadow-none ring-0 lg:flex lg:w-[clamp(18rem,33vw,27.5rem)] lg:flex-none lg:shrink-0 lg:pl-4">
      {cartNode}
    </section>
  )

  const mobileFab = (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end lg:hidden">
      <div className="pointer-events-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="group flex items-center gap-3 rounded-2xl border border-white/25 bg-[var(--brand)] px-4 py-3.5 text-left text-white shadow-lg shadow-[var(--brand)]/35 ring-4 ring-white/80 transition active:scale-[0.98] dark:border-white/10 dark:ring-gray-950/80 dark:shadow-[var(--brand)]/25"
          aria-label={`Open cart, ${items.length} items`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <ShoppingBag className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 pr-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/85">
              Cart
            </span>
            <span className="block text-sm font-bold tabular-nums">
              {items.length}{' '}
              {items.length === 1 ? 'item' : 'items'}
            </span>
          </span>
          {items.length > 0 ? (
            <span className="max-w-[7rem] truncate rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold tabular-nums ring-1 ring-white/25">
              {cartTotals.total > 0 ? formatCurrency(cartTotals.total, tenantConfig) : '—'}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  )

  const drawerSubtitle =
    items.length === 0
      ? 'Add products from the grid'
      : `${items.length} line${items.length === 1 ? '' : 's'} · ${cartTotals.total > 0 ? `Total ${formatCurrency(cartTotals.total, tenantConfig)}` : 'Ready when you are'}`

  const mobileCartDrawer = (
    <MobileCartDrawer
      open={drawer}
      onClose={() => setDrawer(false)}
      variant="express"
      title="Cart"
      subtitle={drawerSubtitle}
    >
      {mobileCartNode}
    </MobileCartDrawer>
  )

  const modals = (
    <>
      {pos.supportsTableSplit ? (
        <SplitBillModal
          open={splitOpen}
          onOpenChange={setSplitOpen}
          items={items}
          tenantConfig={tenantConfig}
          onPaySelected={onPaySelectedLines}
          onEqualSplitWithTips={onEqualSplitWithTips}
        />
      ) : null}

      <PaymentModal
        key={payNonce}
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o)
          if (!o) {
            setPartialLineIds(null)
            setPaySplitRows(null)
            setPayInitialMode('single')
            setPayOrderTotal(null)
            setPayTipsTotal(0)
          }
        }}
        total={paymentDue}
        tenantConfig={tenantConfig}
        splitRowsInitial={paySplitRows}
        initialMode={payInitialMode}
        onComplete={completePay}
      />
      <ReceiptModal
        open={rcOpen}
        onOpenChange={setRcOpen}
        order={lastOrder}
        tenantConfig={tenantConfig}
        meta={{
          cashierName: currentUser?.name,
          customerName: lastOrder?.customerName ?? activeCustomer?.name,
          branchName: activeBranch?.name,
          registerId: tenantId ? getJSON(tenantId, 'activeRegisterId', '') : '',
        }}
      />

      <ManagerPinModal
        open={mgrOpen}
        onOpenChange={setMgrOpen}
        tenantId={tenantId}
        token={currentUser?.token}
        onApproved={() => {
          mgrOkRef.current = true
          setMgrOpen(false)
          const fn = payContinueRef.current
          payContinueRef.current = null
          fn?.()
        }}
      />

      <BarcodeScannerModal
        open={scanOpen}
        onOpenChange={setScanOpenWithReset}
        continuous={scanContinuous}
        onContinuousChange={setScanContinuous}
        onDetected={handleBarcodeDetected}
      />

      <Modal
        open={Boolean(scanMissingCode)}
        onOpenChange={(o) => {
          if (!o) setScanMissingCode(null)
        }}
        title="Product not found"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setScanMissingCode(null)}>
              Close
            </Button>
            {can('catalog') ? (
              <Button
                type="button"
                onClick={() => {
                  const b = scanMissingCode ?? ''
                  setScanMissingCode(null)
                  navigate('/products', {
                    state: { prefillBarcode: b },
                  })
                }}
              >
                New product with this barcode
              </Button>
            ) : null}
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No product uses barcode{' '}
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {scanMissingCode}
          </span>
          . Add the item in Products (catalog permission required) or check the code.
        </p>
      </Modal>

      <Modal
        open={heldOpen}
        onOpenChange={setHeldOpen}
        title="Held carts"
        footer={
          <Button type="button" variant="secondary" onClick={() => setHeldOpen(false)}>
            Close
          </Button>
        }
      >
        {(() => {
          const raw = tenantId ? getJSON(tenantId, 'heldCarts', []) : []
          const list = (Array.isArray(raw) ? raw : []).filter(
            (h) => !h.branchId || h.branchId === activeBranchId,
          )
          if (!list.length) {
            return <p className="text-sm text-gray-500">No held carts for this branch.</p>
          }
          return (
            <ul className="max-h-72 space-y-2 overflow-auto">
              {list.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {h.createdAt ? format(new Date(h.createdAt), 'PPp') : 'Held cart'}
                  </span>
                  <Button type="button" onClick={() => resumeHeld(h)}>
                    Resume
                  </Button>
                </li>
              ))}
            </ul>
          )
        })()}
      </Modal>
    </>
  )

  return (
    <PosLayout
      businessName={tenantConfig?.businessName}
      businessLabel={businessLabel}
      catalogStatsLine={catalogStatsLine}
      appointmentsEnabled={Boolean(tenantConfig?.modules?.appointments)}
      toolbar={posToolbar}
      grid={gridSection}
      cart={cartSection}
      mobileFab={mobileFab}
      drawer={mobileCartDrawer}
      modals={modals}
    />
  )
}
