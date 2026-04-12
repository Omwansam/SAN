import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Bottom sheet for cart on small viewports. Portals to document.body so it
 * isn’t clipped by scroll parents and stacks predictably under modals (z-40).
 *
 * @param {'default' | 'express'} [variant] — `express`: dark shell for the express cart (no light title chrome).
 */
export function MobileCartDrawer({
  open,
  onClose,
  title = 'Cart',
  subtitle,
  children,
  variant = 'default',
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const express = variant === 'express'

  const node = (
    <div
      className="cart-drawer-root fixed inset-0 z-[40] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-cart-title"
    >
      <button
        type="button"
        className={`cart-drawer-backdrop absolute inset-0 backdrop-blur-[3px] ${
          express ? 'bg-black/70' : 'bg-gray-950/55 dark:bg-black/65'
        }`}
        aria-label="Close cart"
        onClick={onClose}
      />
      <div
        className={`cart-drawer-sheet pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,920px)] flex-col overflow-hidden rounded-t-[1.75rem] border shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.35)] ${
          express
            ? 'border-white/10 bg-[#0a0a0c] dark:shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.65)]'
            : 'border-gray-200/90 bg-white dark:border-gray-700/90 dark:bg-gray-900 dark:shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.55)]'
        }`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className={`flex shrink-0 flex-col items-center pt-3 pb-1 ${express ? 'pb-0' : ''}`}>
          <span
            className={`h-1 w-11 shrink-0 rounded-full ${
              express ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-hidden
          />
        </div>
        <div
          className={`flex shrink-0 items-center justify-between gap-3 px-3 pb-2 pt-1 sm:px-4 ${
            express ? 'border-b border-white/[0.06]' : 'border-b border-gray-100 dark:border-gray-800'
          }`}
        >
          {express ? (
            <div className="min-w-0 flex-1 text-center">
              <h2 id="mobile-cart-title" className="sr-only">
                {title}
              </h2>
              {subtitle ? (
                <p className="text-xs font-medium text-gray-400">{subtitle}</p>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="mobile-cart-title"
                className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
              ) : null}
            </div>
          )}
          <button
            type="button"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
              express
                ? 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={onClose}
            aria-label="Close cart drawer"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
            express ? 'px-2 pb-2 pt-1' : 'px-3 pb-2 pt-1 sm:px-4'
          }`}
        >
          <div className={express ? 'h-full min-h-0' : undefined}>{children}</div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
