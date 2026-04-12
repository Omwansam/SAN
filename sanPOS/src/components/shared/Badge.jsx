export function Badge({ children, variant = 'default', className = '' }) {
  const styles = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    brand: 'bg-[var(--brand)]/15 text-[var(--brand)]',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant] ?? styles.default} ${className}`}
    >
      {children}
    </span>
  )
}
