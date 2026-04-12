import { forwardRef } from 'react'

export const Button = forwardRef(function Button(
  { children, className = '', variant = 'primary', type = 'button', ...props },
  ref,
) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const variants = {
    primary:
      'bg-[var(--brand)] text-white hover:opacity-95 active:opacity-90 focus-visible:ring-[var(--brand)]',
    secondary:
      'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
    ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
  }
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
