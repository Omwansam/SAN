import { PackageOpen } from 'lucide-react'

export function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  icon,
}) {
  const Graphic = icon ?? PackageOpen
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900/40"
      role="status"
      aria-label={title}
    >
      <Graphic className="mb-4 h-12 w-12 text-gray-400" aria-hidden />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
