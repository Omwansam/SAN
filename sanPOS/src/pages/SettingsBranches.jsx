import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { useAuth } from '../hooks/useAuth'
import { useBranch } from '../hooks/useBranch'
import { useTenant } from '../hooks/useTenant'
import { apiRequest } from '../utils/api'

export default function SettingsBranches() {
  const { tenantId, tenantConfig } = useTenant()
  const { can, currentUser } = useAuth()
  const { refreshBranches } = useBranch()
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', address: '' })
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!tenantConfig) return null
  if (!can('settings')) return <Navigate to="/settings" replace />

  const workspaceQuery = tenantId ? `?workspace=${encodeURIComponent(tenantId)}` : ''

  async function reloadData() {
    if (!tenantId || !currentUser?.token) return
    const [branchesRes, usersRes] = await Promise.all([
      apiRequest(`/api/branches${workspaceQuery}`, { token: currentUser.token }),
      apiRequest(`/api/users${workspaceQuery}`, { token: currentUser.token }),
    ])
    setBranches(Array.isArray(branchesRes?.data) ? branchesRes.data : [])
    setUsers(Array.isArray(usersRes?.data) ? usersRes.data : [])
    refreshBranches()
  }

  useEffect(() => {
    if (!tenantId || !currentUser?.token) return
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        await reloadData()
      } catch (error) {
        if (mounted) toast.error(error.message || 'Failed to load branch settings')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [tenantId, currentUser?.token])

  async function saveBranch() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!tenantId || !currentUser?.token) return
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
    }
    try {
      if (editing) {
        await apiRequest(`/api/branches/${editing.id}${workspaceQuery}`, {
          method: 'PUT',
          body: payload,
          token: currentUser.token,
        })
        toast.success('Branch updated')
      } else {
        await apiRequest(`/api/branches${workspaceQuery}`, {
          method: 'POST',
          body: payload,
          token: currentUser.token,
        })
        toast.success('Branch created')
      }
      await reloadData()
      setOpen(false)
      setEditing(null)
      setForm({ name: '', address: '' })
    } catch (error) {
      toast.error(error.message || 'Failed to save branch')
    }
  }

  async function confirmDelete() {
    if (!deleteId || !tenantId || !currentUser?.token) return
    try {
      await apiRequest(`/api/branches/${deleteId}${workspaceQuery}`, {
        method: 'DELETE',
        token: currentUser.token,
      })
      await reloadData()
      toast.success('Branch removed')
      setDeleteId(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete branch')
    }
  }

  function branchAccess(u, branchId) {
    const ids = u.branchIds
    if (!Array.isArray(ids) || ids.length === 0) return true
    return ids.includes(branchId)
  }

  async function toggleUserBranch(u, branchId) {
    if (!tenantId || !currentUser?.token) return
    const allIds = branches.map((b) => b.id)
    let next = Array.isArray(u.branchIds) ? [...u.branchIds] : []
    const impliesAll = next.length === 0
    if (impliesAll) {
      next = allIds.filter((id) => id !== branchId)
    } else if (next.includes(branchId)) {
      next = next.filter((id) => id !== branchId)
    } else {
      next.push(branchId)
    }
    if (next.length === 0 || next.length === allIds.length) next = []
    try {
      await apiRequest(`/api/branches/users/${u.id}/access${workspaceQuery}`, {
        method: 'PUT',
        token: currentUser.token,
        body: { branchIds: next },
      })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, branchIds: next } : x)))
      toast.success('Branch access updated')
    } catch (error) {
      toast.error(error.message || 'Failed to update branch access')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Branches
        </h1>
        <Button
          type="button"
          onClick={() => {
            setEditing(null)
            setForm({ name: '', address: '' })
            setOpen(true)
          }}
        >
          New branch
        </Button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Each branch keeps its own open cart and order history. Assign staff to limit which branches they can open.
      </p>
      {loading ? (
        <p className="text-sm text-gray-500">Loading branches...</p>
      ) : branches.length === 0 ? (
        <EmptyState title="No branches" />
      ) : (
        <ul className="space-y-2">
          {branches.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="font-medium">{b.name}</p>
                {b.address ? (
                  <p className="text-sm text-gray-500">{b.address}</p>
                ) : null}
                <p className="font-mono text-xs text-gray-400">{b.id}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    setEditing(b)
                    setForm({ name: b.name, address: b.address ?? '' })
                    setOpen(true)
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs text-red-600"
                  onClick={() => setDeleteId(b.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-semibold">Staff branch access</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Empty selection means access to all branches. Restrict by unchecking branches the user should not open.
        </p>
        <ul className="space-y-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="rounded-xl border border-gray-100 p-3 dark:border-gray-800"
            >
              <p className="text-sm font-medium">{u.name}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {branches.map((b) => (
                  <label
                    key={b.id}
                    className="flex cursor-pointer items-center gap-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={branchAccess(u, b.id)}
                      onChange={() => toggleUserBranch(u, b.id)}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit branch' : 'New branch'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveBranch}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Address (optional)"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete branch?"
        description="Orders for this branch stay in history. Active carts for this branch are removed from devices."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onOpenChange={(o) => !o && setDeleteId(null)}
      />
    </div>
  )
}
