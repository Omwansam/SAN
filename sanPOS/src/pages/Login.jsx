import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { Package, Pill, UtensilsCrossed, Sparkles, LayoutGrid } from 'lucide-react'
import { DEMO_WORKSPACE_SLUG } from '../constants/sampleCredentials'
import {
  DEMO_CATEGORY_PRESETS,
  LEGACY_HUB_SLUG,
  LEGACY_DEMO_LOGIN,
  UNIFIED_POS_LOGIN,
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

  const demoIcons = {
    'demo-retail': Package,
    'demo-pharmacy': Pill,
    'demo-restaurant': UtensilsCrossed,
    'demo-salon': Sparkles,
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

      const isKnownDemoSlug =
        normalized === LEGACY_HUB_SLUG ||
        DEMO_CATEGORY_PRESETS.some((p) => p.slug === normalized)

      let users = getJSON(normalized, 'users', [])
      const hasConfig = Boolean(getJSON(normalized, 'config', null))

      if (!Array.isArray(users) || users.length === 0) {
        try {
          if (hasConfig) {
            await ensureUnifiedDemoStaff(normalized)
            users = getJSON(normalized, 'users', [])
          } else if (isKnownDemoSlug) {
            await ensureCategoryDemoWorkspace(normalized)
            users = getJSON(normalized, 'users', [])
          }
        } catch {
          toast.error('Could not prepare staff for this workspace. Try a demo tile or onboarding.')
          return
        }
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
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-10 dark:from-gray-950 dark:to-gray-900"
      role="main"
      aria-label="Sign in"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Use your workspace slug, or load a demo below — each includes a full product catalogue for
            that vertical.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-[var(--brand)]" aria-hidden />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Demo POS by category
            </h2>
          </div>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            One click seeds <strong>categories + products</strong> and sets the workspace slug. Use the
            same staff logins for every tile (see box below). Open <strong>POS</strong> after sign-in to
            browse the grid for that business type.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEMO_CATEGORY_PRESETS.map((d) => {
              const Icon = demoIcons[d.slug] ?? Package
              const busy = demoBusy && demoLoadingSlug === d.slug
              return (
                <div
                  key={d.slug}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{d.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{d.subtitle}</p>
                    </div>
                  </div>
                  <code className="mb-3 block truncate rounded-lg bg-white px-2 py-1 text-xs font-mono text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {d.slug}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-auto w-full"
                    disabled={demoBusy || slugLocked}
                    onClick={() => prepareAndPrefill(d.slug)}
                  >
                    {busy ? 'Preparing…' : 'Prepare & fill login'}
                  </Button>
                </div>
              )
            })}
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-gray-900/60">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Legacy all-in-one slug <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{LEGACY_HUB_SLUG}</code>
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Older installs may still use {LEGACY_DEMO_LOGIN.adminEmail}. New installs use unified emails
              below.
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
                : `Prepare "${DEMO_WORKSPACE_SLUG}" (pharmacy hub)`}
            </Button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-dashed border-[var(--brand)]/35 bg-[var(--brand)]/[0.06] p-5 text-sm text-gray-700 dark:text-gray-200">
          <p className="font-semibold text-gray-900 dark:text-gray-100">Unified demo staff (all demo-* workspaces)</p>
          <ul className="mt-3 space-y-2 text-gray-600 dark:text-gray-300">
            <li>
              Admin:{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-gray-800">
                {UNIFIED_POS_LOGIN.adminEmail}
              </code>{' '}
              · password{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-gray-800">
                {UNIFIED_POS_LOGIN.password}
              </code>{' '}
              · PIN{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-gray-800">
                {UNIFIED_POS_LOGIN.adminPin}
              </code>
            </li>
            <li>
              Cashier:{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-gray-800">
                {UNIFIED_POS_LOGIN.cashierEmail}
              </code>{' '}
              · same password · PIN{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-gray-800">
                {UNIFIED_POS_LOGIN.cashierPin}
              </code>
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            If sign-in fails on slug <code className="rounded bg-white/80 px-1 dark:bg-gray-800">{LEGACY_HUB_SLUG}</code> only, try{' '}
            <code className="rounded bg-white/80 px-1 dark:bg-gray-800">{LEGACY_DEMO_LOGIN.adminEmail}</code> with the same password.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              id="workspace-slug"
              label="Workspace slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="e.g. acme"
              autoComplete="organization"
              disabled={slugLocked}
              aria-label="Workspace slug"
              required
            />
            {slugLocked ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Slug was taken from this site&apos;s subdomain.
              </p>
            ) : null}

            <div
              className="flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
              role="tablist"
              aria-label="Sign-in method"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'password'}
                aria-label="Sign in with password"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'password'
                    ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400'
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
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'pin'
                    ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                onClick={() => setMode('pin')}
              >
                PIN
              </button>
            </div>

            {mode === 'password' ? (
              <>
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
              </>
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
              />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              aria-label="Sign in"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            New workspace?{' '}
            <Link
              to="/onboarding"
              className="font-semibold text-[var(--brand)] hover:underline"
            >
              Set up onboarding
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
