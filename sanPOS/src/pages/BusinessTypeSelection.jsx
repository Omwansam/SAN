import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useTenant } from '../hooks/useTenant'
import { useAuth } from '../hooks/useAuth'
import { createDefaultTenantConfig, withTenantDefaults } from '../utils/tenantDefaults'
import { apiRequest } from '../utils/api'

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
  const { currentUser } = useAuth()
  const [selectedType, setSelectedType] = useState(tenantConfig?.businessType || 'retail')
  const [saving, setSaving] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '' })
  const [pinConfigured, setPinConfigured] = useState(Boolean(currentUser?.hasPin))
  const [pinPrompted, setPinPrompted] = useState(false)

  const businessName = useMemo(
    () => tenantConfig?.businessName || 'your business',
    [tenantConfig?.businessName],
  )

  useEffect(() => {
    if (!tenantId || !tenantConfig) {
      navigate('/onboarding', { replace: true })
    }
  }, [tenantId, tenantConfig, navigate])

  useEffect(() => {
    setPinConfigured(Boolean(currentUser?.hasPin))
  }, [currentUser?.hasPin])

  useEffect(() => {
    if (!pinConfigured && !pinPrompted) {
      setPinModalOpen(true)
      setPinPrompted(true)
    }
  }, [pinConfigured, pinPrompted])

  if (!tenantId || !tenantConfig) return null

  const submit = async () => {
    setSaving(true)
    try {
      const shouldIncludeSampleData = tenantConfig?.includeSampleData !== false

      const nextConfig = withTenantDefaults(
        {
          ...tenantConfig,
          businessType: selectedType,
          businessTypeConfirmed: true,
          modules: modulesForBusinessType(selectedType),
          workspaceInitialized: true,
        },
        tenantId,
      )
      if (!currentUser?.token) {
        toast.error('Session expired. Please sign in again.')
        navigate('/login', { replace: true })
        return
      }
      await apiRequest('/api/onboarding/business-type', {
        method: 'PATCH',
        token: currentUser.token,
        body: {
          workspaceSlug: tenantId,
          businessType: selectedType,
          businessTypeConfirmed: true,
          workspaceInitialized: true,
          includeSampleData: shouldIncludeSampleData,
          modules: nextConfig.modules,
        },
      })
      setTenantConfig(nextConfig)
      toast.success('Business type selected.')
      if (!pinConfigured) {
        setPinModalOpen(true)
        return
      }
      navigate('/pos', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Failed to save business type.')
    } finally {
      setSaving(false)
    }
  }

  const savePin = async () => {
    if (!tenantId || !currentUser?.token) return
    if (!/^\d{4,8}$/.test(pinForm.pin)) {
      toast.error('PIN must be 4-8 digits.')
      return
    }
    if (pinForm.pin !== pinForm.confirmPin) {
      toast.error('PINs do not match.')
      return
    }
    setPinSaving(true)
    try {
      await apiRequest(`/api/users/pin?workspace=${encodeURIComponent(tenantId)}`, {
        method: 'PUT',
        token: currentUser.token,
        body: { pin: pinForm.pin },
      })
      setPinConfigured(true)
      setPinModalOpen(false)
      toast.success('PIN saved.')
      navigate('/pos', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Failed to save PIN.')
    } finally {
      setPinSaving(false)
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
      <Modal
        open={pinModalOpen}
        onOpenChange={(open) => {
          if (!open && !pinConfigured) return
          setPinModalOpen(open)
        }}
        title="Create your PIN"
        description="Set a PIN now so you can quickly sign in next time."
        footer={
          <Button type="button" onClick={savePin} disabled={pinSaving}>
            {pinSaving ? 'Saving...' : 'Save PIN'}
          </Button>
        }
      >
        <div className="space-y-3">
          <Input
            label="PIN"
            type="password"
            inputMode="numeric"
            value={pinForm.pin}
            onChange={(e) =>
              setPinForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 8) }))
            }
            placeholder="4-8 digits"
          />
          <Input
            label="Confirm PIN"
            type="password"
            inputMode="numeric"
            value={pinForm.confirmPin}
            onChange={(e) =>
              setPinForm((prev) => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 8) }))
            }
            placeholder="Repeat PIN"
          />
        </div>
      </Modal>
    </main>
  )
}
