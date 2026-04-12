import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'h-8 w-8 text-[var(--brand)]', label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8" role="status" aria-label={label}>
      <Loader2 className={`animate-spin ${className}`} aria-hidden />
    </div>
  )
}
