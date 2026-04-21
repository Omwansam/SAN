import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Receipt, Sparkles } from 'lucide-react'
import { useBranch } from '../hooks/useBranch'
import { useCart } from '../hooks/useCart'
import { useCustomerDisplayRegisterOnline } from '../hooks/useCustomerDisplayRegisterOnline'
import { useTenant } from '../hooks/useTenant'
import { CUSTOMER_DISPLAY_CHANNEL } from '../utils/customerDisplayChannel'
import { computeCartTotals, lineNet } from '../utils/posTotals'
import { formatCurrency } from '../utils/currency'

const THANK_YOU_MS = 4800

function businessInitials(name) {
  const t = String(name ?? '').trim()
  if (!t) return 'SP'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase().slice(0, 2)
  }
  return t.slice(0, 2).toUpperCase()
}

function useClockTick(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

function CustomerIdleSplash({
  tenantConfig,
  businessName,
  initials,
  activeBranch,
  online,
  now,
}) {
  const logoRaw =
    String(tenantConfig?.logo ?? '').trim() || String(tenantConfig?.logoDataUrl ?? '').trim()
  const hasLogoImage =
    logoRaw &&
    (logoRaw.startsWith('http://') ||
      logoRaw.startsWith('https://') ||
      logoRaw.startsWith('data:') ||
      logoRaw.startsWith('/'))

  const timeLine = format(now, 'h:mm:ss a')
  const dateLine = format(now, 'EEEE, MMMM d, yyyy')

  return (
    <div className="customer-display-splash-enter relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex w-full max-w-lg flex-col items-center gap-8 sm:max-w-xl sm:gap-10">
        {/* Logo or initials */}
        {hasLogoImage ? (
          <div className="flex h-28 w-full max-w-[220px] items-center justify-center sm:h-32">
            <img
              src={logoRaw}
              alt=""
              className="max-h-full max-w-full object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
            />
          </div>
        ) : (
          <div
            className="flex h-28 w-28 items-center justify-center rounded-3xl text-3xl font-black tracking-tight shadow-2xl sm:h-32 sm:w-32 sm:text-4xl"
            style={{
              background: 'color-mix(in srgb, var(--brand) 32%, rgb(15 23 42))',
              color: 'var(--brand)',
              boxShadow:
                'inset 0 1px 0 rgb(255 255 255 / 0.1), 0 0 0 1px color-mix(in srgb, var(--brand) 45%, transparent), 0 24px 48px -16px rgb(0 0 0 / 0.6)',
            }}
            aria-hidden
          >
            {initials}
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {businessName}
          </h1>
          {activeBranch?.name ? (
            <p className="text-lg text-white/50 sm:text-xl">{activeBranch.name}</p>
          ) : null}
        </div>

        <p className="text-2xl font-semibold text-white/80 sm:text-3xl">Welcome</p>

        <div className="flex flex-col items-center gap-2 border-y border-white/[0.1] py-8 sm:py-10">
          <p className="text-4xl font-light tabular-nums tracking-tight text-white sm:text-5xl lg:text-6xl">
            {timeLine}
          </p>
          <p className="text-base text-white/45 sm:text-lg">{dateLine}</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <span
            className={`h-4 w-4 rounded-full shadow-lg ring-4 ring-white/10 ${
              online ? 'bg-emerald-400 shadow-emerald-500/40' : 'bg-red-500 shadow-red-600/40'
            }`}
            aria-hidden
          />
          <p className="text-xl font-semibold text-white sm:text-2xl">Ready to serve you</p>
          <p
            className={`text-sm font-bold uppercase tracking-widest sm:text-base ${
              online ? 'text-emerald-400/90' : 'text-red-400/90'
            }`}
            role="status"
            aria-live="polite"
          >
            {online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CustomerDisplay() {
  const [searchParams] = useSearchParams()
  const thankYouEnabled = searchParams.get('thankYou') !== '0'

  const { tenantId, tenantConfig } = useTenant()
  const { activeBranch } = useBranch()
  const { items, orderDiscount, serviceMode } = useCart()

  const [thankYou, setThankYou] = useState(null)
  const thankTimer = useRef(null)

  const { online: registerOpenOnline } = useCustomerDisplayRegisterOnline(tenantId)
  const now = useClockTick(1000)

  const deliveryFeeOpts = useMemo(() => {
    const fee = Number(tenantConfig?.deliveryFee) || 0
    const isRest = tenantConfig?.businessType === 'restaurant'
    const include = isRest && serviceMode === 'delivery' && fee > 0
    return { deliveryFee: fee, includeDeliveryFee: include }
  }, [tenantConfig?.deliveryFee, tenantConfig?.businessType, serviceMode])

  const totals = useMemo(
    () =>
      computeCartTotals(
        items,
        orderDiscount,
        tenantConfig?.taxRate ?? 0,
        deliveryFeeOpts,
      ),
    [items, orderDiscount, tenantConfig?.taxRate, deliveryFeeOpts],
  )

  const taxLabel = tenantConfig?.taxLabel?.trim() || 'Tax'

  const clearThankYouTimer = useCallback(() => {
    if (thankTimer.current) {
      window.clearTimeout(thankTimer.current)
      thankTimer.current = null
    }
  }, [])

  const showThankYou = useCallback(
    (payload) => {
      clearThankYouTimer()
      setThankYou({
        total: payload?.total,
        partial: Boolean(payload?.partial),
        at: payload?.at ?? Date.now(),
      })
      thankTimer.current = window.setTimeout(() => {
        setThankYou(null)
        thankTimer.current = null
      }, THANK_YOU_MS)
    },
    [clearThankYouTimer],
  )

  useEffect(() => {
    document.documentElement.classList.add('customer-display-active')
    return () => {
      document.documentElement.classList.remove('customer-display-active')
    }
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    let ch
    try {
      ch = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL)
    } catch {
      return undefined
    }
    ch.onmessage = (ev) => {
      const data = ev?.data
      if (data?.type === 'sale_complete' && thankYouEnabled) {
        showThankYou(data)
      }
    }
    return () => {
      ch.close()
    }
  }, [showThankYou, thankYouEnabled])

  useEffect(() => () => clearThankYouTimer(), [clearThankYouTimer])

  const businessName = tenantConfig?.businessName || 'SanPOS'
  const initials = businessInitials(businessName)

  const showIdleSplash = items.length === 0 && !thankYou
  const showOrderView = items.length > 0 && !thankYou

  return (
    <main
      className="customer-display-root relative min-h-[100dvh] overflow-hidden text-white antialiased"
      style={{
        background:
          'radial-gradient(ellipse 100% 70% at 50% -15%, color-mix(in srgb, var(--brand) 42%, transparent), transparent 52%), radial-gradient(ellipse 80% 50% at 100% 100%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 42%), #020617',
      }}
    >
      <div
        className="customer-display-dotgrid pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 15% 40%, var(--brand), transparent 72%)',
        }}
        aria-hidden
      />

      {showIdleSplash ? (
        <CustomerIdleSplash
          tenantConfig={tenantConfig}
          businessName={businessName}
          initials={initials}
          activeBranch={activeBranch}
          online={registerOpenOnline}
          now={now}
        />
      ) : null}

      {showOrderView ? (
        <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          <header className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] backdrop-blur-md sm:px-7 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black tracking-tight shadow-lg sm:h-16 sm:w-16 sm:text-xl"
                  style={{
                    background: 'color-mix(in srgb, var(--brand) 28%, rgb(15 23 42))',
                    color: 'var(--brand)',
                    boxShadow:
                      'inset 0 1px 0 rgb(255 255 255 / 0.08), 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent)',
                  }}
                  aria-hidden
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {businessName}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      <span
                        className="customer-display-live-dot h-1.5 w-1.5 rounded-full bg-[var(--brand)]"
                        aria-hidden
                      />
                      Live
                    </span>
                  </div>
                  {activeBranch?.name ? (
                    <p className="mt-1 truncate text-base text-white/50 sm:text-lg">{activeBranch.name}</p>
                  ) : (
                    <p className="mt-1 text-base text-white/45 sm:text-lg">Customer display</p>
                  )}
                </div>
              </div>

              <div
                className="flex shrink-0 items-center gap-4 rounded-2xl border px-5 py-3 sm:px-6 sm:py-4"
                style={{
                  borderColor: 'color-mix(in srgb, var(--brand) 38%, rgb(255 255 255 / 0.12))',
                  background: 'color-mix(in srgb, var(--brand) 12%, rgb(15 23 42 / 0.85))',
                }}
              >
                <Receipt className="h-8 w-8 shrink-0 text-white/35 sm:h-9 sm:w-9" strokeWidth={1.25} aria-hidden />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">Lines</p>
                  <p
                    className="mt-0.5 text-4xl font-black tabular-nums leading-none sm:text-5xl"
                    style={{ color: 'var(--brand)' }}
                  >
                    {items.length}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,24rem)] lg:items-stretch lg:gap-8 xl:gap-10">
            <aside
              className="order-1 flex flex-col justify-between rounded-3xl border border-white/[0.09] p-6 shadow-2xl sm:p-8 lg:order-2 lg:p-9"
              style={{
                background:
                  'linear-gradient(155deg, color-mix(in srgb, var(--brand) 26%, rgb(15 23 42)) 0%, rgb(3 7 18 / 0.96) 55%, rgb(2 6 23) 100%)',
                boxShadow:
                  'inset 0 1px 0 color-mix(in srgb, var(--brand) 45%, transparent), 0 28px 64px -32px rgb(0 0 0 / 0.75)',
              }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Amount due</p>
                <p
                  className="mt-3 text-[clamp(2.5rem,8vw,5.5rem)] font-black leading-[0.95] tracking-tight tabular-nums"
                  style={{
                    color: 'var(--brand)',
                    textShadow: '0 0 48px color-mix(in srgb, var(--brand) 35%, transparent)',
                  }}
                >
                  {formatCurrency(totals.total, tenantConfig)}
                </p>
              </div>

              <dl className="mt-8 space-y-0 divide-y divide-white/[0.08] border-t border-white/[0.08] pt-6 text-base sm:text-lg">
                <div className="flex items-center justify-between gap-4 py-3.5 text-white/70 first:pt-0">
                  <dt>Subtotal</dt>
                  <dd className="font-bold tabular-nums text-white">
                    {formatCurrency(totals.subtotal, tenantConfig)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3.5 text-white/70">
                  <dt>Discount</dt>
                  <dd className="font-bold tabular-nums text-emerald-300/95">
                    −{formatCurrency(totals.discountAmount, tenantConfig)}
                  </dd>
                </div>
                {totals.deliveryFeeAmount > 0 ? (
                  <div className="flex items-center justify-between gap-4 py-3.5 text-white/70">
                    <dt>Delivery</dt>
                    <dd className="font-bold tabular-nums text-white">
                      {formatCurrency(totals.deliveryFeeAmount, tenantConfig)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4 py-3.5 text-white/70">
                  <dt>{taxLabel}</dt>
                  <dd className="font-bold tabular-nums text-white">
                    {formatCurrency(totals.taxAmount, tenantConfig)}
                  </dd>
                </div>
              </dl>
            </aside>

            <section className="order-2 flex min-h-0 flex-col rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-7 lg:order-1 lg:p-9">
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/[0.08] pb-4 sm:mb-6 sm:pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Your order</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Items</h2>
                </div>
              </div>

              <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 sm:space-y-3.5">
                {items.map((item) => {
                  const amount = lineNet(item)
                  return (
                    <li
                      key={item.lineId}
                      className="group grid grid-cols-1 items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-4 transition hover:border-white/[0.12] hover:bg-black/35 sm:grid-cols-[1fr_auto] sm:gap-5 sm:px-5 sm:py-5"
                      style={{
                        boxShadow: 'inset 3px 0 0 0 var(--brand)',
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-balance text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl lg:text-3xl">
                          {item.name}
                        </p>
                        <p className="mt-1.5 text-base text-white/45 sm:text-lg">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums text-white/90"
                              style={{
                                background: 'color-mix(in srgb, var(--brand) 22%, rgb(15 23 42))',
                              }}
                            >
                              ×{item.qty}
                            </span>
                            <span className="text-white/35">@</span>
                            <span className="tabular-nums text-white/55">
                              {formatCurrency(item.unitPrice, tenantConfig)}
                            </span>
                          </span>
                        </p>
                      </div>
                      <p
                        className="text-right text-2xl font-black tabular-nums sm:text-3xl lg:text-4xl"
                        style={{ color: 'var(--brand)' }}
                      >
                        {formatCurrency(amount, tenantConfig)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        </div>
      ) : null}

      {thankYou ? (
        <div
          className="customer-display-thank-you-backdrop fixed inset-0 z-50 flex items-center justify-center px-5"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className="customer-display-thank-you-card relative max-w-lg rounded-3xl border px-8 py-10 text-center shadow-2xl sm:max-w-2xl sm:px-12 sm:py-14"
            style={{
              borderColor: 'color-mix(in srgb, var(--brand) 50%, rgb(255 255 255 / 0.35))',
              background:
                'linear-gradient(168deg, color-mix(in srgb, var(--brand) 32%, rgb(15 23 42)), rgb(2 6 23))',
              boxShadow:
                '0 0 100px -24px color-mix(in srgb, var(--brand) 55%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.1)',
            }}
          >
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full sm:mb-8 sm:h-24 sm:w-24"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand) 38%, transparent)',
                color: 'var(--brand)',
              }}
              aria-hidden
            >
              <Sparkles className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.75} />
            </div>
            <p
              className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl"
              style={{ color: 'var(--brand)' }}
            >
              Thank you!
            </p>
            <p className="mt-4 text-lg font-medium text-white/75 sm:text-xl lg:text-2xl">
              {thankYou.partial ? 'Partial payment received.' : 'We appreciate your business.'}
            </p>
            {typeof thankYou.total === 'number' ? (
              <p className="mt-5 text-2xl font-bold tabular-nums text-white sm:text-3xl">
                {formatCurrency(thankYou.total, tenantConfig)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}
