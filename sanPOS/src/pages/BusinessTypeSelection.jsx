import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import { useTenant } from '../hooks/useTenant'
import { createDefaultTenantConfig, withTenantDefaults } from '../utils/tenantDefaults'

const BUSINESS_TYPES = [
  { id: 'retail', label: 'Retail' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'salon', label: 'Salon' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'liquor', label: 'Liquor store' },
  { id: 'custom', label: 'Custom' },
]

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
    case 'laundry':
      return { ...base, inventory: true, loyalty: true, appointments: true }
    case 'liquor':
      return { ...base, inventory: true, loyalty: true, multiRegister: true }
    default:
      return { ...base, inventory: true }
  }
}

export default function BusinessTypeSelection() {
  const navigate = useNavigate()
  const { tenantId, tenantConfig, setTenantConfig } = useTenant()
  const [selectedType, setSelectedType] = useState(tenantConfig?.businessType || 'retail')
  const [saving, setSaving] = useState(false)

  const businessName = useMemo(
    () => tenantConfig?.businessName || 'your business',
    [tenantConfig?.businessName],
  )

  useEffect(() => {
    if (!tenantId || !tenantConfig) {
      navigate('/onboarding', { replace: true })
    }
  }, [tenantId, tenantConfig, navigate])

  if (!tenantId || !tenantConfig) return null

  const submit = () => {
    setSaving(true)
    try {
      const nextConfig = withTenantDefaults(
        {
          ...tenantConfig,
          businessType: selectedType,
          businessTypeConfirmed: true,
          modules: modulesForBusinessType(selectedType),
        },
        tenantId,
      )
      setTenantConfig(nextConfig)
      toast.success('Business type selected.')
      navigate('/pos', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-950">
      <section className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          One-time setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Select your business type
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This helps us tailor POS navigation and features for {businessName}.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedType(type.id)}
              className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                selectedType === type.id
                  ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'border-gray-200 text-gray-700 hover:border-[var(--brand)]/40 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={submit} disabled={saving} aria-label="Continue to POS">
            {saving ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </section>
    </main>
  )
}
