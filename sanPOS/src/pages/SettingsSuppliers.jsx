import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { apiRequest } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'

const INITIAL_FORM = {
  name: '',
  contactPerson: '',
  email: '',
  phoneNumber: '',
  address: '',
  taxId: '',
  isActive: true,
}

export default function SettingsSuppliers() {
  const { tenantId, tenantConfig } = useTenant()
  const { can, currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [delId, setDelId] = useState(null)

  useEffect(() => {
    if (!tenantId || !currentUser?.token) return
    const workspace = `?workspace=${encodeURIComponent(tenantId)}`
    setLoading(true)
    apiRequest(`/api/suppliers${workspace}`, { token: currentUser.token })
      .then((res) => setItems(Array.isArray(res?.data) ? res.data : []))
      .catch((error) => toast.error(error.message || 'Failed to load suppliers'))
      .finally(() => setLoading(false))
  }, [tenantId, currentUser?.token])

  if (!tenantConfig) return null
  if (!can('settings')) return <Navigate to="/settings" replace />

  function openCreate() {
    setEditing(null)
    setForm(INITIAL_FORM)
    setOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name ?? '',
      contactPerson: item.contactPerson ?? '',
      email: item.email ?? '',
      phoneNumber: item.phoneNumber ?? '',
      address: item.address ?? '',
      taxId: item.taxId ?? '',
      isActive: item.isActive !== false,
    })
    setOpen(true)
  }

  async function save() {
    if (!tenantId || !currentUser?.token) return
    if (!form.name.trim()) {
      toast.error('Supplier name is required')
      return
    }
    const workspace = `?workspace=${encodeURIComponent(tenantId)}`
    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || null,
      email: form.email.trim() || null,
      phoneNumber: form.phoneNumber.trim() || null,
      address: form.address.trim() || null,
      taxId: form.taxId.trim() || null,
      isActive: Boolean(form.isActive),
    }
    try {
      const res = await apiRequest(
        editing
          ? `/api/suppliers/${encodeURIComponent(editing.id)}${workspace}`
          : `/api/suppliers${workspace}`,
        {
          method: editing ? 'PUT' : 'POST',
          body: payload,
          token: currentUser.token,
        },
      )
      const saved = res?.data
      if (!saved) throw new Error('Unexpected response from backend')
      setItems((prev) =>
        editing ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev],
      )
      setOpen(false)
      setEditing(null)
      setForm(INITIAL_FORM)
      toast.success(editing ? 'Supplier updated' : 'Supplier created')
    } catch (error) {
      toast.error(error.message || 'Failed to save supplier')
    }
  }

  async function removeById(id) {
    if (!tenantId || !currentUser?.token || !id) return
    const workspace = `?workspace=${encodeURIComponent(tenantId)}`
    try {
      await apiRequest(`/api/suppliers/${encodeURIComponent(id)}${workspace}`, {
        method: 'DELETE',
        token: currentUser.token,
      })
      setItems((prev) => prev.filter((x) => x.id !== id))
      toast.success('Supplier deleted')
    } catch (error) {
      toast.error(error.message || 'Failed to delete supplier')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Suppliers
        </h1>
        <Button type="button" onClick={openCreate}>
          Add supplier
        </Button>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading suppliers...</p> : null}
      {!loading && items.length === 0 ? <EmptyState title="No suppliers" /> : null}
      {!loading && items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/80">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium">{it.name}</td>
                  <td className="px-4 py-3">{it.contactPerson || '—'}</td>
                  <td className="px-4 py-3">{it.email || '—'}</td>
                  <td className="px-4 py-3">{it.phoneNumber || '—'}</td>
                  <td className="px-4 py-3">{it.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => openEdit(it)}>
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="ml-2 text-xs font-medium text-red-600 hover:underline"
                      onClick={() => setDelId(it.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit supplier' : 'New supplier'}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Supplier name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Contact person" value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input label="Phone number" value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
          <Input label="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <Input label="Tax ID" value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(delId)}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete supplier?"
        description="This may fail if purchase orders reference this supplier."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (delId) void removeById(delId)
        }}
      />
    </div>
  )
}
