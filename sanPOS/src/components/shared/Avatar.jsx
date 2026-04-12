function initials(name) {
  const p = String(name ?? '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export function Avatar({
  name,
  src,
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  }
  const s = sizes[size] ?? sizes.md
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`inline-block rounded-full object-cover ring-2 ring-white dark:ring-gray-900 ${s} ${className}`}
      />
    )
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[var(--brand)]/20 font-semibold text-[var(--brand)] ring-2 ring-white dark:ring-gray-900 ${s} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
