import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Badge } from '../components/shared/Badge'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { apiRequest } from '../utils/api'

const ROLES = ['cashier', 'manager', 'admin', 'superadmin']

export default function SettingsUsers() {
  const { tenantId, tenantConfig } = useTenant()
  const { can, currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    pin: '',
  })
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinTargetUser, setPinTargetUser] = useState(null)
  const [pinValue, setPinValue] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSelfMode, setPinSelfMode] = useState(false)

  useEffect(() => {
    if (!tenantId || !currentUser?.token) return
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const workspace = `?workspace=${encodeURIComponent(tenantId)}`
        const [usersRes, branchesRes] = await Promise.all([
          apiRequest(`/api/users${workspace}`, { token: currentUser.token }),
          apiRequest(`/api/branches${workspace}`, { token: currentUser.token }),
        ])
        if (!mounted) return
        setUsers(Array.isArray(usersRes?.data) ? usersRes.data : [])
        setBranches(Array.isArray(branchesRes?.data) ? branchesRes.data : [])
      } catch (error) {
        if (mounted) toast.error(error.message || 'Failed to load users')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [tenantId, currentUser?.token])

  if (!tenantConfig) return null
  if (!can('users')) return <Navigate to="/settings" replace />

  async function reloadUsers() {
    if (!tenantId || !currentUser?.token) return
    const workspace = `?workspace=${encodeURIComponent(tenantId)}`
    const usersRes = await apiRequest(`/api/users${workspace}`, { token: currentUser.token })
    setUsers(Array.isArray(usersRes?.data) ? usersRes.data : [])
  }

  async function addUser() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error('Fill name, email, password (6+).')
      return
    }
    if (form.pin && !/^\d{4,8}$/.test(form.pin)) {
      toast.error('PIN must be 4-8 digits.')
      return
    }
    if (!tenantId || !currentUser?.token) return
    try {
      await apiRequest(`/api/users?workspace=${encodeURIComponent(tenantId)}`, {
        method: 'POST',
        token: currentUser.token,
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          pin: ['cashier', 'manager'].includes(form.role) && form.pin.trim() ? form.pin.trim() : undefined,
        },
      })
      await reloadUsers()
      toast.success('User created')
      setOpen(false)
      setForm({ name: '', email: '', password: '', role: 'cashier', pin: '' })
    } catch (error) {
      toast.error(error.message || 'Failed to create user')
    }
  }

  async function saveUserPin() {
    if (!tenantId || !currentUser?.token || !pinTargetUser?.id) return
    if (pinValue && !/^\d{4,8}$/.test(pinValue)) {
      toast.error('PIN must be 4-8 digits.')
      return
    }
    setPinSaving(true)
    try {
      await apiRequest(`/api/users/${pinTargetUser.id}?workspace=${encodeURIComponent(tenantId)}`, {
        method: 'PATCH',
        token: currentUser.token,
        body: { pin: pinValue || null },
      })
      await reloadUsers()
      toast.success(pinValue ? 'PIN updated' : 'PIN cleared')
      setPinModalOpen(false)
      setPinTargetUser(null)
      setPinValue('')
    } catch (error) {
      toast.error(error.message || 'Failed to update PIN')
    } finally {
      setPinSaving(false)
    }
  }

  async function saveMyPin() {
    if (!tenantId || !currentUser?.token) return
    if (!/^\d{4,8}$/.test(pinValue)) {
      toast.error('PIN must be 4-8 digits.')
      return
    }
    setPinSaving(true)
    try {
      await apiRequest(`/api/users/pin?workspace=${encodeURIComponent(tenantId)}`, {
        method: 'PUT',
        token: currentUser.token,
        body: { pin: pinValue },
      })
      await reloadUsers()
      toast.success('Your PIN has been saved')
      setPinModalOpen(false)
      setPinTargetUser(null)
      setPinValue('')
      setPinSelfMode(false)
    } catch (error) {
      toast.error(error.message || 'Failed to update your PIN')
    } finally {
      setPinSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Users
        </h1>
        <Button type="button" onClick={() => setOpen(true)}>
          Add user
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading users...</p>
      ) : users.length === 0 ? (
        <EmptyState title="No users" />
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {u.name}
                  <Badge variant={u.active === false ? 'warning' : 'default'}>
                    {u.active === false ? 'Inactive' : 'Active'}
                  </Badge>
                  <Badge variant="brand" className="capitalize">
                    {u.role}
                  </Badge>
                </p>
                <p className="text-sm text-gray-500">{u.email}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Branches:{' '}
                  {!Array.isArray(u.branchIds) || u.branchIds.length === 0
                    ? 'All'
                    : u.branchIds
                        .map(
                          (id) =>
                            branches.find((b) => b.id === id)?.name ?? id,
                        )
                        .join(', ')}
                </p>
                <p className="mt-1 text-xs text-gray-400">PIN: {u.hasPin ? 'Set' : 'Not set'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-2 !py-1 text-xs"
                  onClick={async () => {
                    if (!tenantId || !currentUser?.token) return
                    try {
                      await apiRequest(`/api/users/${u.id}?workspace=${encodeURIComponent(tenantId)}`, {
                        method: 'PATCH',
                        token: currentUser.token,
                        body: { active: u.active === false },
                      })
                      await reloadUsers()
                      const wasInactive = u.active === false
                      toast.success(wasInactive ? 'Activated' : 'Deactivated')
                    } catch (error) {
                      toast.error(error.message || 'Failed to update user status')
                    }
                  }}
                >
                  {u.active === false ? 'Activate' : 'Deactivate'}
                </Button>
                <select
                  className="rounded-xl border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                  value={u.role}
                  onChange={async (e) => {
                    if (!tenantId || !currentUser?.token) return
                    try {
                      await apiRequest(`/api/users/${u.id}?workspace=${encodeURIComponent(tenantId)}`, {
                        method: 'PATCH',
                        token: currentUser.token,
                        body: { role: e.target.value },
                      })
                      await reloadUsers()
                      toast.success('Role updated')
                    } catch (error) {
                      toast.error(error.message || 'Failed to update role')
                    }
                  }}
                  aria-label={`Role for ${u.name}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {['cashier', 'manager'].includes(u.role) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => {
                      setPinTargetUser(u)
                      setPinValue('')
                      setPinModalOpen(true)
                    }}
                  >
                    {u.hasPin ? 'Reset PIN' : 'Set PIN'}
                  </Button>
                ) : null}
                {u.id === currentUser?.id ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => {
                      setPinTargetUser(u)
                      setPinValue('')
                      setPinSelfMode(true)
                      setPinModalOpen(true)
                    }}
                  >
                    {u.hasPin ? 'Reset My PIN' : 'Set My PIN'}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New user"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addUser}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Role
            <select
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, pin: '' })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {['cashier', 'manager'].includes(form.role) ? (
            <Input
              label="PIN (optional, 4-8 digits)"
              type="password"
              inputMode="numeric"
              value={form.pin}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 8) }))
              }
            />
          ) : null}
        </div>
      </Modal>
      <Modal
        open={pinModalOpen}
        onOpenChange={(open) => {
          setPinModalOpen(open)
          if (!open) {
            setPinTargetUser(null)
            setPinValue('')
            setPinSelfMode(false)
          }
        }}
        title={pinSelfMode ? (pinTargetUser?.hasPin ? 'Reset My PIN' : 'Set My PIN') : (pinTargetUser?.hasPin ? 'Reset user PIN' : 'Set user PIN')}
        description={
          pinTargetUser
            ? pinSelfMode
              ? 'Enter a new PIN for your account.'
              : `Update PIN for ${pinTargetUser.name}. Leave empty to clear PIN.`
            : ''
        }
        footer={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setPinModalOpen(false)
                setPinTargetUser(null)
                setPinValue('')
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={pinSelfMode ? saveMyPin : saveUserPin} disabled={pinSaving}>
              {pinSaving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <Input
          label={pinSelfMode ? 'PIN (4-8 digits)' : 'PIN (4-8 digits, leave blank to clear)'}
          type="password"
          inputMode="numeric"
          value={pinValue}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
      </Modal>
    </div>
  )
}
