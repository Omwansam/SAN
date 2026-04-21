/**
 * Full-screen splash shown when the login page is idle (matches startup splash look).
 * @param {{ open: boolean, onTapContinue?: () => void }} props
 */
export function LoginIdleSplash({ open, onTapContinue }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[2147483000] flex touch-manipulation flex-col items-center justify-center bg-[radial-gradient(ellipse_120%_90%_at_50%_-15%,#1e3a8a_0%,transparent_55%),linear-gradient(180deg,#0f172a_0%,#070b12_100%)] p-6 text-slate-50 [-webkit-tap-highlight-color:transparent]"
      role="dialog"
      aria-modal="true"
      aria-label="Session paused"
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        onTapContinue?.()
      }}
    >
      <div
        className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-800 text-3xl font-black tracking-tight text-white shadow-[0_0_0_1px_rgb(255_255_255/0.12),0_20px_50px_-12px_rgb(37_99_235/0.45)]"
        aria-hidden
      >
        S
      </div>
      <h2 className="mt-6 text-center text-3xl font-bold tracking-tight sm:text-4xl">SanPOS</h2>
      <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-400">
        Still here? Press a key or tap anywhere to continue signing in.
      </p>
      <div className="mt-9 h-[3px] w-[min(10rem,42vw)] overflow-hidden rounded-full bg-white/10">
        <div className="login-idle-splash-shimmer h-full w-[40%] rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
      </div>
    </div>
  )
}
