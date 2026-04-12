import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { hashPassword } from '../utils/password'
import { getJSON, setJSON } from '../utils/storage'
import { newId } from '../utils/uuid'

const ROLES = ['cashier', 'manager', 'admin', 'superadmin']

export default function SettingsUsers() {
  const { tenantId, tenantConfig } = useTenant()
  const { can } = useAuth()
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
  })

  useEffect(() => {
    if (!tenantId) return
    queueMicrotask(() => setUsers(getJSON(tenantId, 'users', [])))
  }, [tenantId])

  if (!tenantConfig) return null
  if (!can('users')) return <Navigate to="/settings" replace />

  function persist(next) {
    if (!tenantId) return
    setJSON(tenantId, 'users', next)
    setUsers(next)
  }

  async function addUser() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error('Fill name, email, password (6+).')
      return
    }
    const passwordHash = await hashPassword(form.password)
    persist([
      ...users,
      {
        id: newId(),
        tenantId,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        passwordHash,
        role: form.role,
        pin: '',
        active: true,
        lastLogin: null,
        registerId: null,
      },
    ])
    toast.success('User created')
    setOpen(false)
    setForm({ name: '', email: '', password: '', role: 'cashier' })
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
      {users.length === 0 ? (
        <EmptyState title="No users" />
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <select
                className="rounded-xl border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={u.role}
                onChange={(e) => {
                  const next = users.map((x) =>
                    x.id === u.id ? { ...x, role: e.target.value } : x,
                  )
                  persist(next)
                  toast.success('Role updated')
                }}
                aria-label={`Role for ${u.name}`}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </div>
  )
}
