import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { createDefaultTenantConfig, withTenantDefaults } from '../utils/tenantDefaults'
import { registerTenantInGlobalList } from '../utils/tenantRegistry'
import { apiRequest } from '../utils/api'

const LANGS = ['en', 'sw', 'fr', 'ar']
const STEP_TITLES = [
  'Create account',
  'Business details',
  'Billing',
  'Verify email',
  'Setting up',
]
const HEADER_STEPS = ['Create your', 'Business details', 'Billing', 'Verify email', 'Setting up']
const SETUP_STATUS_LINES = [
  'Your workspace will have its own secure environment with dedicated resources...',
  'Setting up your own dedicated database to keep your data completely isolated...',
  'Almost there! Finalizing your workspace configuration...',
  "This takes a little while because we ensure your data never mixes with anyone else's...",
  "We're creating a private workspace just for you...",
]
const INDUSTRY_OPTIONS = [
  'Retail',
  'Healthcare',
  'Food & beverage',
  'Pharmacy',
  'Salon & beauty',
  'Grocery',
  'Laundry',
  'Hospitality',
  'Electronics',
  'Fashion',
  'Other',
]
const BUSINESS_SIZE_OPTIONS = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees',
]
const SUBDOMAIN_SUFFIX = '.your-domain.com'

/** Dial codes for phone field (flag + code dropdown). */
const PHONE_COUNTRIES = [
  { iso: 'KE', flag: '🇰🇪', dial: '+254', label: 'Kenya' },
  { iso: 'UG', flag: '🇺🇬', dial: '+256', label: 'Uganda' },
  { iso: 'TZ', flag: '🇹🇿', dial: '+255', label: 'Tanzania' },
  { iso: 'RW', flag: '🇷🇼', dial: '+250', label: 'Rwanda' },
  { iso: 'ET', flag: '🇪🇹', dial: '+251', label: 'Ethiopia' },
  { iso: 'ZA', flag: '🇿🇦', dial: '+27', label: 'South Africa' },
  { iso: 'NG', flag: '🇳🇬', dial: '+234', label: 'Nigeria' },
  { iso: 'GH', flag: '🇬🇭', dial: '+233', label: 'Ghana' },
  { iso: 'US', flag: '🇺🇸', dial: '+1', label: 'United States' },
  { iso: 'GB', flag: '🇬🇧', dial: '+44', label: 'United Kingdom' },
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

function slugifyBusinessId(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { tenantId, tenantConfig, switchTenant, setTenantConfig } = useTenant()
  const { login, isAuthenticated } = useAuth()
  const [step, setStep] = useState(0)
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [businessSize, setBusinessSize] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [timezone] = useState('Africa/Nairobi')
  const [language] = useState('en')
  const [logo] = useState('')
  const [primaryColor] = useState('#2563eb')
  const [currencyCode] = useState('KES')
  const [currencySymbol] = useState('KSh')
  const [currencyPos] = useState('before')
  const [taxRate] = useState(16)
  const [taxLabel] = useState('VAT')
  const [modules] = useState(() => modulesForBusinessType('retail'))
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [phoneCountryIso, setPhoneCountryIso] = useState('KE')
  const [adminPhoneLocal, setAdminPhoneLocal] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [includeSampleData] = useState(true)
  const [billingPlan, setBillingPlan] = useState('monthly')
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', ''])
  const [resendCountdown, setResendCountdown] = useState(26)
  const [setupMessageIndex, setSetupMessageIndex] = useState(0)
  const [setupProgress, setSetupProgress] = useState(50)
  const [draftId, setDraftId] = useState('')
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isStepSubmitting, setIsStepSubmitting] = useState(false)
  const setupAutoSubmittedRef = useRef(false)
  const setupFinishTimeoutRef = useRef(null)
  const finishRef = useRef(null)
  const totalSteps = STEP_TITLES.length
  const passwordChecks = useMemo(
    () => ({
      minLen: adminPassword.length >= 8,
      upper: /[A-Z]/.test(adminPassword),
      lower: /[a-z]/.test(adminPassword),
      number: /[0-9]/.test(adminPassword),
    }),
    [adminPassword],
  )
  const passwordScore = useMemo(() => {
    let score = 0
    if (passwordChecks.minLen) score += 1
    if (passwordChecks.upper) score += 1
    if (passwordChecks.lower) score += 1
    if (passwordChecks.number) score += 1
    if (adminPassword.length >= 12) score += 1
    return score
  }, [adminPassword.length, passwordChecks])
  const passwordStrength = useMemo(() => {
    if (!adminPassword) {
      return { label: '', color: '', barClass: 'bg-gray-200 dark:bg-gray-700', width: '0%' }
    }
    if (passwordScore <= 2) {
      return {
        label: 'Weak',
        color: 'text-red-600 dark:text-red-400',
        barClass: 'bg-red-500',
        width: '33%',
      }
    }
    if (passwordScore <= 3) {
      return {
        label: 'Fair',
        color: 'text-amber-600 dark:text-amber-400',
        barClass: 'bg-amber-500',
        width: '66%',
      }
    }
    return {
      label: 'Strong',
      color: 'text-emerald-600 dark:text-emerald-400',
      barClass: 'bg-emerald-500',
      width: '100%',
    }
  }, [adminPassword, passwordScore])
  const passwordStrong = Object.values(passwordChecks).every(Boolean)
  const passwordsMatch =
    adminConfirmPassword.length > 0 && adminPassword === adminConfirmPassword

  const selectedPhoneCountry = useMemo(
    () => PHONE_COUNTRIES.find((c) => c.iso === phoneCountryIso) ?? PHONE_COUNTRIES[0],
    [phoneCountryIso],
  )

  const adminPhoneDigits = useMemo(
    () => adminPhoneLocal.replace(/\D/g, ''),
    [adminPhoneLocal],
  )

  const adminPhoneFull = useMemo(() => {
    if (!adminPhoneDigits) return ''
    return `${selectedPhoneCountry.dial} ${adminPhoneDigits}`
  }, [adminPhoneDigits, selectedPhoneCountry.dial])
  const verificationCodeValue = verificationCode.join('')
  const maskedEmail = useMemo(() => {
    const email = adminEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return 'your-email@example.com'
    const [name, domain] = email.split('@')
    const visible = name.slice(0, 2)
    return `${visible}${'*'.repeat(Math.max(4, name.length - 2))}@${domain}`
  }, [adminEmail])
  const currentSetupLine = SETUP_STATUS_LINES[setupMessageIndex] ?? SETUP_STATUS_LINES[0]

  const ensureDraftId = useCallback(async () => {
    if (draftId) return draftId

    const draft = await apiRequest('/api/onboarding/draft', {
      method: 'POST',
      body: {
        adminFirstName,
        adminLastName,
        adminEmail,
        phoneCountryIso,
        adminPhoneLocal: adminPhoneDigits,
        adminPhoneFull: adminPhoneFull.trim(),
        adminPassword,
        passwordScore,
        agreeTerms,
      },
    })
    const createdId = draft?.draft?.id
    if (!createdId) {
      throw new Error('Failed to create onboarding draft.')
    }
    setDraftId(createdId)
    return createdId
  }, [
    draftId,
    adminFirstName,
    adminLastName,
    adminEmail,
    phoneCountryIso,
    adminPhoneDigits,
    adminPhoneFull,
    adminPassword,
    passwordScore,
    agreeTerms,
  ])

  useEffect(() => {
    if (step !== 3) return
    if (resendCountdown <= 0) return
    const timer = window.setInterval(() => {
      setResendCountdown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, resendCountdown])

  useEffect(() => {
    if (step !== 4) return
    const lineTimer = window.setInterval(() => {
      setSetupMessageIndex((index) => (index + 1) % SETUP_STATUS_LINES.length)
    }, 2400)
    const progressTimer = window.setInterval(() => {
      setSetupProgress((value) => (value < 100 ? Math.min(100, value + 2) : 100))
    }, 220)
    return () => {
      window.clearInterval(lineTimer)
      window.clearInterval(progressTimer)
    }
  }, [step])

  useEffect(() => {
    if (step !== 4) return
    if (setupProgress < 100) return
    if (setupAutoSubmittedRef.current) return
    setupAutoSubmittedRef.current = true
    setupFinishTimeoutRef.current = window.setTimeout(() => {
      finishRef.current?.()
    }, 500)
  }, [step, setupProgress])

  useEffect(
    () => () => {
      if (setupFinishTimeoutRef.current) {
        window.clearTimeout(setupFinishTimeoutRef.current)
      }
    },
    [],
  )

  /** Skip wizard only when already signed in with a configured workspace (steps 5–16 live in the app). */
  useEffect(() => {
    if (isAuthenticated && tenantId && tenantConfig) {
      navigate(
        tenantConfig.businessTypeConfirmed === false ? '/business-type' : '/pos',
        { replace: true },
      )
    }
  }, [isAuthenticated, tenantId, tenantConfig, navigate])

  const slugOk = useMemo(
    () => /^[a-z0-9][a-z0-9-]{0,48}$/.test(slug.trim()) && slug.trim().length >= 2,
    [slug],
  )
  const hasBusinessIdentityInput = slug.trim().length > 0 || businessName.trim().length > 0

  const finish = useCallback(async () => {
    setIsFinalizing(true)
    const tid = slug.trim().toLowerCase()
    if (!slugOk) {
      toast.error('Invalid workspace slug.')
      setIsFinalizing(false)
      return
    }
    const fullName = `${adminFirstName} ${adminLastName}`.trim()
    if (!fullName || !adminEmail.trim() || adminPhoneDigits.length < 6) {
      toast.error('Enter first name, last name, email, and a valid phone number.')
      setIsFinalizing(false)
      return
    }
    if (!passwordStrong) {
      toast.error('Password must be 8+ chars with uppercase, lowercase, and number.')
      setIsFinalizing(false)
      return
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match.')
      setIsFinalizing(false)
      return
    }
    if (!agreeTerms) {
      toast.error('Please accept Terms of Service and Privacy Policy.')
      setIsFinalizing(false)
      return
    }
    switchTenant(tid)
    const base = createDefaultTenantConfig(tid)
    const config = {
      ...base,
      businessName: businessName.trim() || tid,
      businessType: 'retail',
      businessTypeConfirmed: false,
      industry,
      businessSize,
      website: businessWebsite.trim(),
      logo,
      primaryColor,
      timezone,
      language,
      billing: {
        ...base.billing,
        planName: billingPlan === 'annual' ? 'Annual' : 'Monthly',
      },
      currency: {
        code: currencyCode,
        symbol: currencySymbol,
        position: currencyPos,
      },
      taxRate: Number(taxRate) || 0,
      taxLabel: taxLabel.trim() || 'Tax',
      modules: { ...base.modules, ...modules },
      includeSampleData,
      workspaceInitialized: false,
    }
    const normalized = withTenantDefaults(config, tid)

    let activeDraftId = draftId
    if (!activeDraftId) {
      try {
        activeDraftId = await ensureDraftId()
      } catch (error) {
        toast.error(error.message || 'Onboarding draft is missing. Please restart onboarding.')
        setIsFinalizing(false)
        return
      }
    }
    let backendSession = null
    try {
      const completion = await apiRequest(`/api/onboarding/draft/${activeDraftId}/complete`, {
        method: 'POST',
        body: {
          includeSampleData,
          businessType: 'retail',
          businessTypeConfirmed: false,
          workspaceInitialized: false,
          modules: normalized.modules,
        },
      })
      backendSession = completion
    } catch (error) {
      toast.error(error.message || 'Failed to finalize onboarding on backend.')
      setupAutoSubmittedRef.current = false
      setIsFinalizing(false)
      return
    }

    setTenantConfig(normalized)
    registerTenantInGlobalList({
      tenantId: tid,
      businessName: normalized.businessName,
    })

    if (!backendSession?.user) {
      toast.error('Backend onboarding completed without session data. Please sign in manually.')
      navigate('/login', { replace: true })
      setIsFinalizing(false)
      return
    }
    login(
      {
        id: backendSession.user.id,
        name: backendSession.user.name,
        email: backendSession.user.email,
        role: backendSession.user.role,
      },
      tid,
      backendSession.token || null,
    )
    toast.success('Account ready. Complete business setup to continue.')
    navigate('/business-type', { replace: true })
    setIsFinalizing(false)
  }, [
    slug,
    slugOk,
    switchTenant,
    setTenantConfig,
    businessName,
    industry,
    businessSize,
    businessWebsite,
    logo,
    primaryColor,
    currencyCode,
    currencySymbol,
    currencyPos,
    taxRate,
    taxLabel,
    modules,
    adminFirstName,
    adminLastName,
    adminEmail,
    adminPhoneDigits,
    passwordStrong,
    passwordsMatch,
    agreeTerms,
    login,
    navigate,
    timezone,
    language,
    includeSampleData,
    billingPlan,
    draftId,
    ensureDraftId,
  ])

  const verifyEmailAndContinue = useCallback(async () => {
    if (isStepSubmitting) return
    setIsStepSubmitting(true)
    try {
    if (verificationCodeValue.length !== 6) {
      toast.error('Enter the 6-digit verification code.')
      return
    }
    let activeDraftId = draftId
    if (!activeDraftId) {
      try {
        activeDraftId = await ensureDraftId()
      } catch (error) {
        toast.error(error.message || 'Onboarding draft missing. Please restart onboarding.')
        return
      }
    }
    try {
      await apiRequest(`/api/onboarding/draft/${activeDraftId}/verify-otp`, {
        method: 'POST',
        body: { verificationCode: verificationCodeValue },
      })
    } catch (error) {
      toast.error(error.message || 'Verification code is invalid or expired.')
      return
    }
    setSetupProgress(50)
    setSetupMessageIndex(0)
    setupAutoSubmittedRef.current = false
    if (setupFinishTimeoutRef.current) {
      window.clearTimeout(setupFinishTimeoutRef.current)
      setupFinishTimeoutRef.current = null
    }
    setStep(4)
    } finally {
      setIsStepSubmitting(false)
    }
  }, [draftId, verificationCodeValue, ensureDraftId, isStepSubmitting])

  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-gray-100 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)]/15 text-[9px] font-bold text-[var(--brand)]">
              SP
            </div>
            <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">SanPOS</p>
          </div>

          <div className="hidden items-center justify-center gap-2 md:flex">
            {HEADER_STEPS.map((title, idx) => {
              const active = idx === step
              const completed = idx < step
              return (
                <div key={title} className="flex items-center gap-1.5">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold ${
                      active
                        ? 'bg-[#2690ff] text-white'
                        : completed
                          ? 'bg-[#d9ecff] text-[#2690ff]'
                          : 'bg-[#eaf4ff] text-[#8fb8de]'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{title}</span>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#1d4ed8] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-hidden px-4 pb-1.5 pt-2 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          <div className="flex-1 overflow-y-auto pr-1">
          {step === 1 ? (
            <div className="space-y-2.5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800/70">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Business Details</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Help us personalize your POS experience
              </p>
            </div>
            <div>
              <Input
                id="slug"
                label="Business ID (Short Name)"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugifyBusinessId(e.target.value))
                }}
                placeholder="e.g. acme-shop"
                aria-label="Business ID (Short Name)"
                className="py-2 text-sm"
                labelClassName="mb-1 text-xs"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Used to uniquely identify your business. Use lowercase letters, numbers, and
                hyphens only.
              </p>
            </div>
            <Input
              id="bn"
              label="Business name"
              value={businessName}
              onChange={(e) => {
                const nextName = e.target.value
                setBusinessName(nextName)
                if (!slugTouched) {
                  setSlug(slugifyBusinessId(nextName))
                }
              }}
              aria-label="Business name"
              className="py-2 text-sm"
              labelClassName="mb-1 text-xs"
            />
            {hasBusinessIdentityInput ? (
              <div className="w-full">
                <label
                  htmlFor="subdomain-preview"
                  className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  Subdomain
                </label>
                <div className="flex overflow-hidden rounded-xl border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                  <input
                    id="subdomain-preview"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setSlug(slugifyBusinessId(e.target.value))
                    }}
                    className="min-w-0 flex-1 border-0 px-3 py-2 text-sm text-[var(--brand)] outline-none ring-0 focus:ring-0 dark:bg-gray-800"
                    aria-label="Subdomain prefix"
                    placeholder="your-business"
                  />
                  <span className="shrink-0 border-l border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    {SUBDOMAIN_SUFFIX}
                  </span>
                </div>
              </div>
            ) : null}
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Industry
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                aria-label="Industry"
              >
                <option value="">Select an option</option>
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Business size
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={businessSize}
                onChange={(e) => setBusinessSize(e.target.value)}
                aria-label="Business size"
              >
                <option value="">Select an option</option>
                {BUSINESS_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <Input
              id="bw"
              label="Business website (optional)"
              type="url"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
              placeholder="https://www.mybusiness.com"
              aria-label="Business website"
              className="py-2 text-sm"
              labelClassName="mb-1 text-xs"
            />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-2.5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/70">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Verify Email</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Confirm your email address</p>
            </div>

            <div className="flex flex-col items-center rounded-xl border border-gray-200 px-3 py-4 text-center dark:border-gray-700">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-[var(--brand)] dark:bg-blue-950/30">
                <Mail size={20} />
              </div>
              <h4 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Verify your email</h4>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                Enter the 6-digit code sent to
              </p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Lock size={14} />
                {maskedEmail}
              </p>

              <div className="mt-4 flex gap-1.5">
                {verificationCode.map((digit, idx) => (
                  <input
                    key={`otp-${idx}`}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(-1)
                      setVerificationCode((prev) => {
                        const next = [...prev]
                        next[idx] = value
                        return next
                      })
                    }}
                    className="h-10 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/30 dark:border-gray-600 dark:bg-gray-900"
                    aria-label={`Verification code digit ${idx + 1}`}
                  />
                ))}
              </div>

              <Button
                type="button"
                className="mt-4 w-full max-w-md"
                disabled={isStepSubmitting}
                onClick={verifyEmailAndContinue}
              >
                {isStepSubmitting ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Didn&apos;t get the code?{' '}
                {resendCountdown > 0 ? (
                  <span className="font-semibold">Resend in {resendCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResendCountdown(26)}
                    className="font-semibold text-[var(--brand)]"
                  >
                    Resend code
                  </button>
                )}
              </p>
            </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-2.5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/70">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Your Plan</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose the billing cycle that fits your business
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 dark:border-blue-900/60 dark:bg-blue-950/20">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-[var(--brand)]">14-day free trial</span> - No credit card required. Full access to all features.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBillingPlan('monthly')}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                billingPlan === 'monthly'
                  ? 'border-[var(--brand)] bg-blue-50/70 ring-1 ring-[var(--brand)]/40 dark:bg-blue-950/20'
                  : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      billingPlan === 'monthly'
                        ? 'bg-[var(--brand)] text-white'
                        : 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'
                    }`}
                  >
                    {billingPlan === 'monthly' ? '✓' : ''}
                  </span>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Monthly</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pay month-to-month, cancel anytime</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">KES 1,500 <span className="text-base font-normal text-gray-500">/user/mo</span></p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">VAT incl.</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBillingPlan('annual')}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                billingPlan === 'annual'
                  ? 'border-[var(--brand)] bg-blue-50/70 ring-1 ring-[var(--brand)]/40 dark:bg-blue-950/20'
                  : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      billingPlan === 'annual'
                        ? 'bg-[var(--brand)] text-white'
                        : 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'
                    }`}
                  >
                    {billingPlan === 'annual' ? '✓' : ''}
                  </span>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      Annual <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-[var(--brand)]">Save 16.67%</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Billed annually, best value</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">KES 14,999 <span className="text-base font-normal text-gray-500">/user/yr</span></p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">VAT incl.</p>
                </div>
              </div>
            </button>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              All prices include {taxRate}% {taxLabel}. Billing starts after your 14-day trial ends.
            </p>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-2.5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/70">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Setting up your workspace...
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This may take a moment, kindly be patient
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
                <span>Provisioning secure resources</span>
                <span className="text-[var(--brand)]">{setupProgress}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
                  style={{ width: `${setupProgress}%` }}
                />
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/25">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Creating Site
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {currentSetupLine}
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This takes a little while because we ensure your data never mixes with anyone
                  else&apos;s.
                </p>
              </div>

              <div className="mt-3 flex items-start gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                <Mail size={13} className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your site details will be sent to your email. You can safely close this page and
                  check your email later.
                </p>
              </div>
            </div>
            </div>
          ) : null}

          {step === 0 ? (
            <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Your Account</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Enter your details to get started with SanPOS
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                id="afn"
                label="First Name *"
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                aria-label="First name"
                placeholder="John"
              />
              <Input
                id="aln"
                label="Last Name *"
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                aria-label="Last name"
                placeholder="Doe"
              />
            </div>
            <Input
              id="ae"
              label="Email Address *"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              aria-label="Admin email"
            />
            <div className="w-full">
              <label
                htmlFor="aph-local"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Phone Number *
              </label>
              <div className="flex overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900">
                <div className="relative w-[6.75rem] shrink-0 border-r border-gray-300 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-800/50 sm:w-[7rem]">
                  <select
                    id="aph-country"
                    value={phoneCountryIso}
                    onChange={(e) => setPhoneCountryIso(e.target.value)}
                    className="h-[42px] w-full cursor-pointer appearance-none bg-transparent py-2 pl-2 pr-7 text-xs font-semibold tabular-nums text-gray-900 outline-none dark:text-gray-100"
                    aria-label="Country calling code"
                  >
                    {PHONE_COUNTRIES.map((c) => (
                      <option key={c.iso} value={c.iso}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] leading-none text-gray-500 dark:text-gray-400">
                    ▼
                  </span>
                </div>
                <input
                  id="aph-local"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={adminPhoneLocal}
                  onChange={(e) => setAdminPhoneLocal(e.target.value)}
                  placeholder="114080686"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:ring-0 dark:text-gray-100"
                  aria-label="Phone number"
                />
              </div>
            </div>
            <div className="w-full">
              <label
                htmlFor="ap"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password *
              </label>
              <div className="relative">
                <input
                  id="ap"
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  aria-label="Admin password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-11 text-gray-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[var(--brand)] disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {adminPassword ? (
              <div className="space-y-2">
                {!passwordChecks.minLen ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Password must be at least 8 characters long
                  </p>
                ) : null}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Password strength</span>
                  <span className={`font-semibold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.barClass}`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
                <div className="grid gap-1 text-xs sm:grid-cols-2">
                  <p className={passwordChecks.minLen ? 'text-emerald-600' : 'text-amber-600'}>
                    {passwordChecks.minLen ? '✓' : '•'} At least 8 characters
                  </p>
                  <p className={passwordChecks.upper ? 'text-emerald-600' : 'text-amber-600'}>
                    {passwordChecks.upper ? '✓' : '•'} One uppercase letter
                  </p>
                  <p className={passwordChecks.lower ? 'text-emerald-600' : 'text-amber-600'}>
                    {passwordChecks.lower ? '✓' : '•'} One lowercase letter
                  </p>
                  <p className={passwordChecks.number ? 'text-emerald-600' : 'text-amber-600'}>
                    {passwordChecks.number ? '✓' : '•'} One number
                  </p>
                </div>
              </div>
            ) : null}
            <div className="w-full">
              <label
                htmlFor="acp"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="acp"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  aria-label="Confirm password"
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 pr-11 text-gray-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-900 dark:text-gray-100 ${
                    adminConfirmPassword && !passwordsMatch
                      ? 'border-red-400 focus:ring-red-500 dark:border-red-500'
                      : 'border-gray-300 focus:ring-[var(--brand)] dark:border-gray-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {adminConfirmPassword && !passwordsMatch ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                Passwords do not match
              </p>
            ) : null}
            <div className="flex items-start gap-1.5">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
                aria-label="Agree to terms"
              />
              <label htmlFor="terms" className="text-xs leading-snug text-gray-600 dark:text-gray-300">
                I agree to the <span className="font-medium text-[var(--brand)]">Terms of Service</span> and{' '}
                <span className="font-medium text-[var(--brand)]">Privacy Policy</span> *
              </label>
            </div>
            </div>
          ) : null}
          </div>
          <div
            className={`mt-2 flex shrink-0 gap-2 border-t border-gray-200 pt-2 dark:border-gray-700 ${
              step >= 2 ? 'justify-between' : 'justify-end'
            }`}
          >
            {step >= 2 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                aria-label="Previous step"
              >
                Back
              </Button>
            ) : null}
            {step < 4 ? (
              <Button
                type="button"
                disabled={isStepSubmitting}
                onClick={async () => {
                  if (step === 3) {
                    await verifyEmailAndContinue()
                    return
                  }
                  if (isStepSubmitting) return
                  setIsStepSubmitting(true)
                  try {
                  if (step === 0) {
                    const fullName = `${adminFirstName} ${adminLastName}`.trim()
                    if (!fullName || !adminEmail.trim() || adminPhoneDigits.length < 6) {
                      toast.error('Enter first name, last name, email, and a valid phone number.')
                      return
                    }
                    if (!passwordStrong) {
                      toast.error(
                        'Password must be 8+ chars with uppercase, lowercase, and number.',
                      )
                      return
                    }
                    if (!passwordsMatch) {
                      toast.error('Passwords do not match.')
                      return
                    }
                    if (!agreeTerms) {
                      toast.error('Please accept Terms of Service and Privacy Policy.')
                      return
                    }
                    try {
                      await ensureDraftId()
                    } catch (error) {
                      toast.error(error.message || 'Failed to start onboarding.')
                      return
                    }
                  }
                  if (step === 1 && !slugOk) {
                    toast.error('Enter a valid slug.')
                    return
                  }
                  if (step === 1) {
                    let activeDraftId = draftId
                    if (!activeDraftId) {
                      try {
                        activeDraftId = await ensureDraftId()
                      } catch (error) {
                        toast.error(error.message || 'Onboarding draft missing. Please restart onboarding.')
                        return
                      }
                    }
                    try {
                      await apiRequest(`/api/onboarding/draft/${activeDraftId}/step-1`, {
                        method: 'PATCH',
                        body: {
                          slug,
                          workspaceSlug: slug,
                          businessName,
                          industry,
                          businessSize,
                          businessWebsite,
                        },
                      })
                    } catch (error) {
                      toast.error(error.message || 'Failed to save business details.')
                      return
                    }
                  }
                  if (step === 2) {
                    let activeDraftId = draftId
                    if (!activeDraftId) {
                      try {
                        activeDraftId = await ensureDraftId()
                      } catch (error) {
                        toast.error(error.message || 'Onboarding draft missing. Please restart onboarding.')
                        return
                      }
                    }
                    try {
                      await apiRequest(`/api/onboarding/draft/${activeDraftId}/step-2`, {
                        method: 'PATCH',
                        body: {
                          billingPlan,
                          trialDays: 14,
                        },
                      })
                      await apiRequest(`/api/onboarding/draft/${activeDraftId}/send-otp`, {
                        method: 'POST',
                      })
                    } catch (error) {
                      toast.error(error.message || 'Failed to prepare email verification.')
                      return
                    }
                  }
                  setStep((s) => s + 1)
                  } finally {
                    setIsStepSubmitting(false)
                  }
                }}
                aria-label={
                  step === 0
                    ? 'Continue to business details'
                    : step >= 2
                      ? 'Submit and continue'
                      : 'Next step'
                }
              >
                {isStepSubmitting ? 'Working...' : step === 0 ? 'Continue' : step >= 2 ? 'Submit' : 'Next'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={finish}
                disabled={isFinalizing}
                aria-label="Complete setup"
              >
                {isFinalizing ? 'Finalizing...' : 'Finish'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 pb-2 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={`progress-${idx}`}
                className={`h-1.5 rounded-full transition ${
                  idx <= step ? 'bg-[var(--brand)]' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
