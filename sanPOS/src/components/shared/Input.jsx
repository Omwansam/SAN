export function Input({
  id,
  label,
  className = '',
  labelClassName = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={id}
          className={`mb-1.5 block text-sm font-medium text-gray-700 ${labelClassName}`}
        >
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={`w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[var(--brand)] disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${className}`}
        {...props}
      />
    </div>
  )
}
