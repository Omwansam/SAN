import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ShoppingBag } from 'lucide-react'
import { MobileCartDrawer } from '../components/layout/MobileCartDrawer'
import { CartPanel } from '../components/pos/CartPanel'
import {
  CustomPosLayout,
  GroceryPosLayout,
  PharmacyPosLayout,
  RestaurantPosLayout,
  RetailPosLayout,
  SalonPosLayout,
} from '../components/pos/layouts/PosExperienceLayouts'
import { PaymentModal } from '../components/pos/PaymentModal'
import { ProductGrid } from '../components/pos/ProductGrid'
import { RecentOrdersStrip } from '../components/pos/RecentOrdersStrip'
import { ReceiptModal } from '../components/pos/ReceiptModal'
import { SplitBillModal } from '../components/pos/SplitBillModal'
import { getPosExperience } from '../config/posExperience'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useCustomers } from '../hooks/useCustomers'
import { useOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
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
import { getJSON, setJSON } from '../utils/storage'
import { newId } from '../utils/uuid'

const POS_LAYOUTS = {
  retail: RetailPosLayout,
  grocery: GroceryPosLayout,
  pharmacy: PharmacyPosLayout,
  restaurant: RestaurantPosLayout,
  salon: SalonPosLayout,
  custom: CustomPosLayout,
}

export default function POS() {
  const { tenantId, tenantConfig } = useTenant()
  const { currentUser, can } = useAuth()
  const { products, categories, updateProduct } = useProducts()
  const { createOrder } = useOrders()
  const { customers, addCustomer, updateCustomer } = useCustomers()
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
  } = useCart()

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
      if (
        tenantConfig?.modules?.prescriptions &&
        p.controlled &&
        !can('controlled_substance')
      ) {
        toast.error('Controlled Rx lines require a manager or admin.')
        return
      }
      addItem({
        id: p.id,
        name: p.name,
        price: p.price,
        qty: p.qty ?? 1,
        discount: p.discount ?? 0,
        note: p.note ?? '',
        controlled: Boolean(p.controlled),
        kitchenStationId: p.kitchenStationId ?? '',
      })
    },
    [addItem, tenantConfig?.modules?.prescriptions, can],
  )

  const openFullPay = useCallback(() => {
    setDrawer(false)
    setPartialLineIds(null)
    setPaySplitRows(null)
    setPayInitialMode('single')
    setPayOrderTotal(null)
    setPayTipsTotal(0)
    bumpPayModal()
    setPayOpen(true)
  }, [bumpPayModal])

  const completePay = useCallback(
    ({ payments, change }) => {
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

      const order = {
        id: newId(),
        tenantId,
        registerId,
        cashierId: currentUser.id,
        customerId: activeCustomer?.id ?? null,
        createdAt: new Date().toISOString(),
        status: 'completed',
        items: orderItems,
        subtotal: t.subtotal,
        taxAmount: t.taxAmount,
        discountAmount: t.discountAmount,
        taxableBase: t.taxableBase,
        total: t.total,
        payments,
        change: change ?? 0,
        receiptPrinted: false,
        notes: '',
        partial: Boolean(partialLineIds?.length),
        tipsTotal: payTipsTotal > 0 ? payTipsTotal : 0,
        deliveryFeeAmount: t.deliveryFeeAmount || 0,
        ...restaurantService,
      }
      createOrder(order)

      if (tenantConfig.modules?.inventory) {
        for (const it of payItems) {
          const pr = products.find((x) => x.id === it.productId)
          if (pr) {
            updateProduct({
              ...pr,
              stock: Math.max(0, (pr.stock ?? 0) - it.qty),
            })
          }
        }
      }

      if (tenantConfig.modules?.loyalty && activeCustomer?.id) {
        const c = customers.find((x) => x.id === activeCustomer.id)
        if (c) {
          const spendBase = t.total
          updateCustomer({
            ...c,
            loyaltyPoints: (c.loyaltyPoints ?? 0) + Math.floor(spendBase / 100),
            totalSpend: (c.totalSpend ?? 0) + spendBase,
          })
        }
      }

      if (pos.sendToKitchenOnSale) {
        const q = getJSON(tenantId, 'kitchenQueue', [])
        const stations = tenantConfig.kitchenStations
        const defaultStation = stations?.[0]?.id ?? 'hot'
        q.push({
          id: newId(),
          orderId: order.id,
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
          createdAt: order.createdAt,
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
      updateProduct,
      updateCustomer,
      clearCart,
      removeLineIds,
      partialLineIds,
      payTipsTotal,
      pos.sendToKitchenOnSale,
      serviceMode,
    ],
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
        addCustomer(nc)
        setActiveCustomer(nc)
      } else {
        setActiveCustomer(c)
      }
      setCustQ('')
    },
    [addCustomer, setActiveCustomer, tenantId],
  )

  const onPaySelectedLines = useCallback((lineIds) => {
    setPartialLineIds(lineIds)
    setPaySplitRows(null)
    setPayInitialMode('single')
    setPayOrderTotal(null)
    setPayTipsTotal(0)
    bumpPayModal()
    setPayOpen(true)
  }, [bumpPayModal])

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
      bumpPayModal()
      setPayOpen(true)
    },
    [bumpPayModal, items, orderDiscount, tenantConfig, serviceMode],
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

  const gridSection = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <section className="flex min-h-[420px] flex-1 flex-col rounded-3xl border border-gray-200/80 bg-[var(--surface-elevated)] p-3 shadow-[var(--surface-card-shadow)] dark:border-gray-800/80 dark:bg-gray-900/95 lg:min-h-[calc(100vh-11rem)] lg:min-h-0 lg:p-5">
        <ProductGrid
          products={products}
          categories={categories}
          tenantConfig={tenantConfig}
          showStock={Boolean(tenantConfig?.modules?.inventory)}
          statsLine={catalogStatsLine}
          onAddProduct={onAdd}
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
          registerId: tenantId ? getJSON(tenantId, 'activeRegisterId', '') : '',
        }}
      />
    </>
  )

  return (
    <PosLayout
      businessName={tenantConfig?.businessName}
      businessLabel={businessLabel}
      catalogStatsLine={catalogStatsLine}
      appointmentsEnabled={Boolean(tenantConfig?.modules?.appointments)}
      grid={gridSection}
      cart={cartSection}
      mobileFab={mobileFab}
      drawer={mobileCartDrawer}
      modals={modals}
    />
  )
}
