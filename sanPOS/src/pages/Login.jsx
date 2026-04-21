import { useCallback, useEffect, useState } from 'react'
import { LoginIdleSplash } from '../components/auth/LoginIdleSplash'
import { useLoginIdleOverlay } from '../hooks/useLoginIdleOverlay'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  LayoutGrid,
  Lock,
  Package,
  Pill,
  Shirt,
  Sparkles,
  UtensilsCrossed,
  Wine,
} from 'lucide-react'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { DEMO_WORKSPACE_SLUG } from '../constants/sampleCredentials'
import {
  DEMO_CATEGORY_PRESETS,
  LEGACY_HUB_SLUG,
  LEGACY_DEMO_LOGIN,
  UNIFIED_POS_LOGIN,
  isCategoryDemoTenantId,
} from '../constants/demoCategoryWorkspaces'
import { ensureCategoryDemoWorkspace } from '../utils/demoWorkspace'
import { ensureUnifiedDemoStaff } from '../utils/ensureUnifiedDemoStaff'
import { verifyPassword } from '../utils/password'
import { getJSON } from '../utils/storage'
import { getWorkspaceSlugFromHostname } from '../utils/subdomain'

function isValidSlug(s) {
  return /^[a-z0-9][a-z0-9-]{0,48}$/.test(s) && s.length >= 2 && s.length <= 50
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { switchTenant, tenantId } = useTenant()
  const { login, isAuthenticated } = useAuth()

  const [slug, setSlug] = useState('')
  const [slugLocked, setSlugLocked] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [mode, setMode] = useState('password')
  const [submitting, setSubmitting] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoLoadingSlug, setDemoLoadingSlug] = useState(null)

  const { open: idleSplashOpen, notifyUserActivity: notifyIdleSplashActivity } =
    useLoginIdleOverlay({
      idleMs: 10_000,
      paused: submitting || demoBusy,
    })

  useEffect(() => {
    if (idleSplashOpen) {
      document.documentElement.classList.add('login-idle-splash-active')
    } else {
      document.documentElement.classList.remove('login-idle-splash-active')
    }
    return () => document.documentElement.classList.remove('login-idle-splash-active')
  }, [idleSplashOpen])

  const demoIcons = {
    'demo-retail': Package,
    'demo-pharmacy': Pill,
    'demo-restaurant': UtensilsCrossed,
    'demo-salon': Sparkles,
    'demo-laundry': Shirt,
    'demo-liquor': Wine,
  }

  useEffect(() => {
    const fromHost = getWorkspaceSlugFromHostname()
    if (fromHost) {
      setSlug(fromHost)
      setSlugLocked(true)
      switchTenant(fromHost)
    }
  }, [switchTenant])

  useEffect(() => {
    if (slugLocked) return
    const q = searchParams.get('workspace')?.trim().toLowerCase()
    if (q && isValidSlug(q)) {
      setSlug(q)
      switchTenant(q)
    }
  }, [searchParams, slugLocked, switchTenant])

  useEffect(() => {
    if (!isAuthenticated || !tenantId) return
    const config = getJSON(tenantId, 'config', null)
    if (!config) navigate('/onboarding', { replace: true })
    else navigate('/pos', { replace: true })
  }, [isAuthenticated, tenantId, navigate])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      const normalized = slug.trim().toLowerCase()
      if (!isValidSlug(normalized)) {
        toast.error(
          'Enter a workspace slug (2–50 characters: lowercase letters, numbers, hyphens).',
        )
        return
      }

      switchTenant(normalized)

      const isKnownDemoSlug = isCategoryDemoTenantId(normalized)

      let users = getJSON(normalized, 'users', [])
      const hasConfig = Boolean(getJSON(normalized, 'config', null))

      try {
        if (isKnownDemoSlug) {
          if (!hasConfig) {
            await ensureCategoryDemoWorkspace(normalized)
          } else {
            await ensureUnifiedDemoStaff(normalized)
          }
          users = getJSON(normalized, 'users', [])
        } else if (!Array.isArray(users) || users.length === 0) {
          if (hasConfig) {
            await ensureUnifiedDemoStaff(normalized)
            users = getJSON(normalized, 'users', [])
          }
        }
      } catch {
        toast.error('Could not prepare staff for this workspace. Try a demo tile or onboarding.')
        return
      }

      if (!Array.isArray(users) || users.length === 0) {
        toast.error(
          'No workspace at this slug, or it has no staff yet. Use onboarding to create one, or open a demo tile above.',
        )
        return
      }

      if (mode === 'pin') {
        const p = pin.trim()
        if (!p) {
          toast.error('Enter your PIN.')
          return
        }
        const matches = users.filter(
          (u) => u.active !== false && String(u.pin ?? '') === p,
        )
        if (matches.length !== 1) {
          toast.error('PIN did not match a unique staff profile.')
          return
        }
        const user = matches[0]
        setSubmitting(true)
        try {
          login(
            {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
            normalized,
          )
          toast.success(`Welcome, ${user.name}`)
        } finally {
          setSubmitting(false)
        }
        return
      }

      const u = username.trim().toLowerCase()
      if (!u) {
        toast.error('Enter your username or email.')
        return
      }
      if (!password) {
        toast.error('Enter your password.')
        return
      }

      const user = users.find(
        (x) =>
          x.active !== false &&
          (String(x.email ?? '').toLowerCase() === u ||
            String(x.name ?? '').toLowerCase() === u),
      )
      if (!user) {
        toast.error('Account not found for this workspace.')
        return
      }

      const ok = await verifyPassword(password, user.passwordHash)
      if (!ok) {
        toast.error('Incorrect password.')
        return
      }

      setSubmitting(true)
      try {
        login(
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          normalized,
        )
        toast.success(`Welcome, ${user.name}`)
      } finally {
        setSubmitting(false)
      }
    },
    [slug, mode, username, password, pin, switchTenant, login],
  )

  async function prepareAndPrefill(slug) {
    setDemoBusy(true)
    setDemoLoadingSlug(slug)
    try {
      await ensureCategoryDemoWorkspace(slug)
      setSlug(slug)
      switchTenant(slug)
      setUsername(UNIFIED_POS_LOGIN.adminEmail)
      setPassword(UNIFIED_POS_LOGIN.password)
      setMode('password')
      toast.success(`Workspace "${slug}" is ready — sign in below.`)
    } catch {
      toast.error('Could not prepare that workspace.')
    } finally {
      setDemoBusy(false)
      setDemoLoadingSlug(null)
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-[var(--surface-muted)] text-gray-900 antialiased dark:text-gray-100"
      role="main"
      aria-label="Sign in"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_srgb,var(--brand)_28%,transparent),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,color-mix(in_srgb,var(--brand)_12%,transparent),transparent)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_srgb,var(--brand)_22%,transparent),transparent_50%),radial-gradient(ellipse_70%_40%_at_100%_80%,color-mix(in_srgb,var(--brand)_10%,transparent),transparent)]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgb(0_0_0/0.02))] dark:bg-[linear-gradient(to_bottom,transparent,rgb(0_0_0/0.25))]" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-stretch lg:gap-0 lg:px-8 lg:py-0">
        {/* Brand column */}
        <section className="flex flex-col justify-center lg:w-[44%] lg:shrink-0 lg:py-16 lg:pr-10">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--brand)] via-indigo-700 to-slate-900 p-8 text-white shadow-[0_24px_80px_-20px_color-mix(in_srgb,var(--brand)_55%,transparent)] sm:p-10 dark:shadow-[0_28px_90px_-24px_rgb(0_0_0/0.65)]">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black tracking-tight ring-1 ring-white/25 backdrop-blur-sm">
                S
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Point of sale
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  SanPOS
                </h1>
              </div>
            </div>
            <p className="max-w-sm text-lg leading-relaxed text-white/90">
              Sign in to your workspace. Runs entirely in your browser — tenant data stays in
              localStorage on this device.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span>Workspace slug + staff password or quick PIN.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span>Demo tiles seed a full catalogue for each vertical.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Form + demos */}
        <div className="flex flex-1 flex-col justify-center lg:py-16 lg:pl-10">
          <div className="mx-auto w-full max-w-lg space-y-8">
            <div className="rounded-3xl border border-gray-200/90 bg-[var(--surface-elevated)]/95 p-6 shadow-[var(--surface-card-shadow)] backdrop-blur-md dark:border-gray-700/80 dark:bg-gray-900/90 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                  Sign in
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Enter your workspace slug and staff credentials. Slug is your tenant id
                  (lowercase, e.g. <span className="font-mono text-gray-600 dark:text-gray-300">acme</span>).
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <Input
                  id="workspace-slug"
                  label="Workspace slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. demo-retail"
                  autoComplete="organization"
                  disabled={slugLocked}
                  aria-label="Workspace slug"
                  className="font-mono text-[0.95rem]"
                  required
                />
                {slugLocked ? (
                  <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Slug was taken from this site&apos;s subdomain.
                  </p>
                ) : null}

                <div
                  className="flex gap-1 rounded-2xl border border-gray-200 bg-gray-50/90 p-1 dark:border-gray-700 dark:bg-gray-800/80"
                  role="tablist"
                  aria-label="Sign-in method"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'password'}
                    aria-label="Sign in with password"
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      mode === 'password'
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-700 dark:text-white dark:ring-gray-600'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    onClick={() => setMode('password')}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'pin'}
                    aria-label="Sign in with PIN"
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      mode === 'pin'
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-700 dark:text-white dark:ring-gray-600'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    onClick={() => setMode('pin')}
                  >
                    PIN only
                  </button>
                </div>

                {mode === 'password' ? (
                  <div className="space-y-4">
                    <Input
                      id="username"
                      label="Username or email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="username"
                      aria-label="Username or email"
                    />
                    <Input
                      id="password"
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      aria-label="Password"
                    />
                  </div>
                ) : (
                  <Input
                    id="pin"
                    label="Staff PIN"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="••••"
                    autoComplete="one-time-code"
                    aria-label="Staff PIN"
                    className="tracking-[0.35em] font-mono"
                  />
                )}

                <Button
                  type="submit"
                  className="group mt-2 w-full !py-3.5 text-base font-bold shadow-lg shadow-[var(--brand)]/25"
                  disabled={submitting}
                  aria-label="Sign in"
                >
                  {submitting ? (
                    'Signing in…'
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      Continue to workspace
                      <ArrowRight
                        className="h-4 w-4 transition group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  )}
                </Button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider">
                  <span className="bg-[var(--surface-elevated)] px-3 text-gray-400 dark:bg-gray-900">
                    Or start fresh
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                New workspace?{' '}
                <Link
                  to="/onboarding"
                  className="font-semibold text-[var(--brand)] underline-offset-2 hover:underline"
                >
                  Run onboarding
                </Link>
              </p>
            </div>

            {/* Demo workspaces */}
            <div className="rounded-3xl border border-gray-200/90 bg-[var(--surface-elevated)]/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 sm:p-7">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)]/12 text-[var(--brand)]">
                  <LayoutGrid className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Demo workspaces
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    One click seeds categories, products, and staff.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {DEMO_CATEGORY_PRESETS.map((d) => {
                  const Icon = demoIcons[d.slug] ?? Package
                  const busy = demoBusy && demoLoadingSlug === d.slug
                  return (
                    <div
                      key={d.slug}
                      className="group flex flex-col rounded-2xl border border-gray-100 bg-gray-50/90 p-4 transition hover:border-[var(--brand)]/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-[var(--brand)]/35"
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/12 text-[var(--brand)] transition group-hover:bg-[var(--brand)]/18">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{d.label}</p>
                          <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                            {d.subtitle}
                          </p>
                        </div>
                      </div>
                      <code className="mb-3 block truncate rounded-lg border border-gray-200/80 bg-white px-2 py-1.5 text-[11px] font-mono text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                        {d.slug}
                      </code>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-auto w-full !py-2.5 text-sm font-semibold"
                        disabled={demoBusy || slugLocked}
                        onClick={() => prepareAndPrefill(d.slug)}
                      >
                        {busy ? 'Preparing…' : 'Prepare & fill login'}
                      </Button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white/70 p-4 dark:border-gray-700 dark:bg-gray-950/40">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Legacy hub slug{' '}
                  <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                    {LEGACY_HUB_SLUG}
                  </code>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Older installs may use <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{LEGACY_DEMO_LOGIN.adminEmail}</code> with the same password as unified demos.
                </p>
                <Button
                  type="button"
                  className="mt-3 w-full sm:w-auto"
                  variant="secondary"
                  disabled={demoBusy || slugLocked}
                  onClick={() => prepareAndPrefill(DEMO_WORKSPACE_SLUG)}
                >
                  {demoBusy && demoLoadingSlug === DEMO_WORKSPACE_SLUG
                    ? 'Preparing…'
                    : `Prepare "${DEMO_WORKSPACE_SLUG}"`}
                </Button>
              </div>
            </div>

            {/* Credentials */}
            <div className="rounded-3xl border border-[var(--brand)]/20 bg-gradient-to-br from-[var(--brand)]/[0.07] to-transparent p-6 dark:border-[var(--brand)]/25 dark:from-[var(--brand)]/10">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Unified demo staff
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Same logins for every <span className="font-mono">demo-*</span> workspace.
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200/80 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Admin
                  </dt>
                  <dd className="mt-2 space-y-1 font-mono text-[11px] text-gray-800 dark:text-gray-200">
                    <div>{UNIFIED_POS_LOGIN.adminEmail}</div>
                    <div>
                      <span className="text-gray-500">pw</span> {UNIFIED_POS_LOGIN.password}
                    </div>
                    <div>
                      <span className="text-gray-500">PIN</span> {UNIFIED_POS_LOGIN.adminPin}
                    </div>
                  </dd>
                </div>
                <div className="rounded-xl border border-gray-200/80 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Cashier
                  </dt>
                  <dd className="mt-2 space-y-1 font-mono text-[11px] text-gray-800 dark:text-gray-200">
                    <div>{UNIFIED_POS_LOGIN.cashierEmail}</div>
                    <div>
                      <span className="text-gray-500">pw</span> {UNIFIED_POS_LOGIN.password}
                    </div>
                    <div>
                      <span className="text-gray-500">PIN</span> {UNIFIED_POS_LOGIN.cashierPin}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <LoginIdleSplash
        open={idleSplashOpen}
        onTapContinue={notifyIdleSplashActivity}
      />
    </main>
  )
}
