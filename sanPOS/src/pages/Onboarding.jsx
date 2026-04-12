import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as Switch from '@radix-ui/react-switch'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { useProducts } from '../hooks/useProducts'
import { useOrders } from '../hooks/useOrders'
import { useCustomers } from '../hooks/useCustomers'
import { hashPassword } from '../utils/password'
import { getJSON, setJSON } from '../utils/storage'
import { seedTenant } from '../utils/seedTenant'
import { createDefaultTenantConfig, withTenantDefaults } from '../utils/tenantDefaults'
import { registerTenantInGlobalList } from '../utils/tenantRegistry'
import { newId } from '../utils/uuid'

const TYPES = ['retail', 'restaurant', 'salon', 'pharmacy', 'grocery', 'custom']
const LANGS = ['en', 'sw', 'fr', 'ar']

function modulesForBusinessType(type) {
  const base = { ...createDefaultTenantConfig('x').modules }
  switch (type) {
    case 'pharmacy':
      return {
        ...base,
        inventory: true,
        prescriptions: true,
        tables: true,
        appointments: true,
        kitchenDisplay: true,
        loyalty: true,
      }
    case 'restaurant':
      return {
        ...base,
        inventory: true,
        tables: true,
        kitchenDisplay: true,
        loyalty: true,
      }
    case 'salon':
      return {
        ...base,
        inventory: true,
        appointments: true,
        loyalty: true,
      }
    case 'grocery':
      return { ...base, inventory: true, loyalty: true }
    default:
      return { ...base, inventory: true }
  }
}

function seedBusinessType(type) {
  if (type === 'grocery' || type === 'custom') return 'retail'
  return type
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { tenantId, tenantConfig, switchTenant, setTenantConfig } = useTenant()
  const { login, isAuthenticated } = useAuth()
  const { reloadFromStorage: reloadProducts } = useProducts()
  const { reloadFromStorage: reloadOrders } = useOrders()
  const { reloadFromStorage: reloadCustomers } = useCustomers()
  const [step, setStep] = useState(0)
  const [slug, setSlug] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('retail')
  const [timezone, setTimezone] = useState('Africa/Nairobi')
  const [language, setLanguage] = useState('en')
  const [logo, setLogo] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [currencyCode, setCurrencyCode] = useState('KES')
  const [currencySymbol, setCurrencySymbol] = useState('KSh')
  const [currencyPos, setCurrencyPos] = useState('before')
  const [taxRate, setTaxRate] = useState(16)
  const [taxLabel, setTaxLabel] = useState('VAT')
  const [modules, setModules] = useState(() => modulesForBusinessType('retail'))
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [includeSampleData, setIncludeSampleData] = useState(true)

  /** Skip wizard only when already signed in with a configured workspace (steps 5–16 live in the app). */
  useEffect(() => {
    if (isAuthenticated && tenantId && tenantConfig) {
      navigate('/pos', { replace: true })
    }
  }, [isAuthenticated, tenantId, tenantConfig, navigate])

  const slugOk = useMemo(
    () => /^[a-z0-9][a-z0-9-]{0,48}$/.test(slug.trim()) && slug.trim().length >= 2,
    [slug],
  )

  const onLogo = useCallback((e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setLogo(String(r.result ?? ''))
    r.readAsDataURL(f)
  }, [])

  const finish = useCallback(async () => {
    const tid = slug.trim().toLowerCase()
    if (!slugOk) {
      toast.error('Invalid workspace slug.')
      return
    }
    if (!adminName.trim() || !adminEmail.trim() || adminPassword.length < 6) {
      toast.error('Enter admin name, email, and password (6+ characters).')
      return
    }
    switchTenant(tid)
    const base = createDefaultTenantConfig(tid)
    const config = {
      ...base,
      businessName: businessName.trim() || tid,
      businessType,
      logo,
      primaryColor,
      timezone,
      language,
      currency: {
        code: currencyCode,
        symbol: currencySymbol,
        position: currencyPos,
      },
      taxRate: Number(taxRate) || 0,
      taxLabel: taxLabel.trim() || 'Tax',
      modules: { ...base.modules, ...modules },
    }
    const normalized = withTenantDefaults(config, tid)
    setTenantConfig(normalized)
    registerTenantInGlobalList({
      tenantId: tid,
      businessName: normalized.businessName,
    })
    const passHash = await hashPassword(adminPassword)
    const adminUser = {
      id: newId(),
      tenantId: tid,
      name: adminName.trim(),
      email: adminEmail.trim().toLowerCase(),
      passwordHash: passHash,
      role: 'admin',
      pin: '',
      active: true,
      lastLogin: null,
      registerId: null,
    }
    const users = getJSON(tid, 'users', [])
    users.push(adminUser)
    setJSON(tid, 'users', users)
    login(
      {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
      tid,
    )
    if (includeSampleData) {
      try {
        await seedTenant(tid, seedBusinessType(businessType))
        reloadProducts()
        reloadOrders()
        reloadCustomers()
      } catch {
        toast.error(
          'Workspace saved but sample data failed to load. Add products under Products.',
        )
      }
    } else {
      const regId = newId()
      setJSON(tid, 'registers', [
        {
          id: regId,
          tenantId: tid,
          name: 'Register 1',
          openingFloat: 0,
          currentFloat: 0,
          status: 'open',
          cashierId: null,
        },
      ])
      setJSON(tid, 'activeRegisterId', regId)
      setJSON(tid, 'categories', [])
      setJSON(tid, 'products', [])
      setJSON(tid, 'orders', [])
      setJSON(tid, 'customers', [])
      reloadProducts()
      reloadOrders()
      reloadCustomers()
    }
    toast.success('Workspace ready — explore POS, products, orders, and reports.')
    navigate('/pos', { replace: true })
  }, [
    slug,
    slugOk,
    switchTenant,
    setTenantConfig,
    businessName,
    businessType,
    logo,
    primaryColor,
    currencyCode,
    currencySymbol,
    currencyPos,
    taxRate,
    taxLabel,
    modules,
    adminName,
    adminEmail,
    adminPassword,
    login,
    navigate,
    timezone,
    language,
    includeSampleData,
    reloadProducts,
    reloadOrders,
    reloadCustomers,
  ])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Workspace setup
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Step {step + 1} of 5 — then use the app for catalogue (6–7), checkout (8–9), orders &
          customers (10–11), reports & settings (12–13), tables / kitchen / appointments (14–16).
        </p>

        {step === 0 ? (
          <div className="mt-6 space-y-4">
            <Input
              id="slug"
              label="Workspace slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="acme"
              aria-label="Workspace slug"
            />
            <Input
              id="bn"
              label="Business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              aria-label="Business name"
            />
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Business type
              </p>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setBusinessType(t)
                      setModules(modulesForBusinessType(t))
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                      businessType === t
                        ? 'bg-[var(--brand)] text-white'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                    aria-label={`Type ${t}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Input
              id="tz"
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              aria-label="Timezone"
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Language
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Language"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Logo
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={onLogo}
                aria-label="Upload logo"
              />
            </label>
            {logo ? (
              <img src={logo} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : null}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Primary color
              <input
                type="color"
                className="mt-1 h-10 w-full max-w-[120px] cursor-pointer rounded border-0"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                aria-label="Primary color"
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="cur"
                label="Currency code"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                aria-label="Currency code"
              />
              <Input
                id="sym"
                label="Symbol"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                aria-label="Currency symbol"
              />
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Symbol position
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={currencyPos}
                onChange={(e) => setCurrencyPos(e.target.value)}
                aria-label="Currency position"
              >
                <option value="before">Before amount</option>
                <option value="after">After amount</option>
              </select>
            </label>
            <Input
              id="tr"
              label="Tax rate %"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              aria-label="Tax rate percent"
            />
            <Input
              id="tl"
              label="Tax label"
              value={taxLabel}
              onChange={(e) => setTaxLabel(e.target.value)}
              aria-label="Tax label"
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-6 space-y-3">
            {Object.entries(modules).map(([key, on]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700"
              >
                <span className="text-sm capitalize text-gray-800 dark:text-gray-200">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <Switch.Root
                  checked={on}
                  onCheckedChange={(v) => setModules((m) => ({ ...m, [key]: v }))}
                  className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-[var(--brand)] dark:bg-gray-700"
                  aria-label={`Toggle ${key}`}
                >
                  <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
                </Switch.Root>
              </div>
            ))}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mt-6 space-y-4">
            <Input
              id="an"
              label="Admin full name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              aria-label="Admin name"
            />
            <Input
              id="ae"
              label="Admin email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              aria-label="Admin email"
            />
            <Input
              id="ap"
              label="Password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              aria-label="Admin password"
            />
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-3 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Include sample catalogue &amp; orders
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Recommended: categories, products, registers, sample orders &amp; customers so POS
                  and reports work immediately.
                </p>
              </div>
              <Switch.Root
                checked={includeSampleData}
                onCheckedChange={setIncludeSampleData}
                className="h-6 w-11 shrink-0 rounded-full bg-gray-200 data-[state=checked]:bg-[var(--brand)] dark:bg-gray-700"
                aria-label="Include sample data"
              >
                <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
              </Switch.Root>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            aria-label="Previous step"
          >
            Back
          </Button>
          {step < 4 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 0 && !slugOk) {
                  toast.error('Enter a valid slug.')
                  return
                }
                setStep((s) => s + 1)
              }}
              aria-label="Next step"
            >
              Next
            </Button>
          ) : (
            <Button type="button" onClick={finish} aria-label="Complete setup">
              Finish
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
