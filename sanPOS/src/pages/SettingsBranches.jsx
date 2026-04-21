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
import { MAIN_BRANCH_ID } from '../utils/defaultBranches'
import { getJSON, setJSON } from '../utils/storage'
import { newId } from '../utils/uuid'

const KEY = 'branches'
const ACTIVE = 'activeBranchId'

export default function SettingsBranches() {
  const { tenantId, tenantConfig } = useTenant()
  const { can } = useAuth()
  const { refreshBranches, activeBranchId } = useBranch()
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', address: '' })
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!tenantId) return
    queueMicrotask(() => {
      setBranches(getJSON(tenantId, KEY, []))
      setUsers(getJSON(tenantId, 'users', []))
    })
  }, [tenantId])

  if (!tenantConfig) return null
  if (!can('settings')) return <Navigate to="/settings" replace />

  function persistBranches(next) {
    if (!tenantId) return
    setJSON(tenantId, KEY, next)
    setBranches(next)
    refreshBranches()
  }

  function persistUsers(next) {
    if (!tenantId) return
    setJSON(tenantId, 'users', next)
    setUsers(next)
  }

  function saveBranch() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (editing) {
      persistBranches(
        branches.map((b) =>
          b.id === editing.id ? { ...b, name: form.name.trim(), address: form.address.trim() } : b,
        ),
      )
      toast.success('Branch updated')
    } else {
      persistBranches([
        ...branches,
        {
          id: newId(),
          name: form.name.trim(),
          address: form.address.trim(),
          createdAt: new Date().toISOString(),
        },
      ])
      toast.success('Branch created')
    }
    setOpen(false)
    setEditing(null)
    setForm({ name: '', address: '' })
  }

  function confirmDelete() {
    if (!deleteId || !tenantId) return
    const next = branches.filter((b) => b.id !== deleteId)
    if (next.length === 0) {
      persistBranches([
        {
          id: MAIN_BRANCH_ID,
          name: 'Main',
          address: '',
          createdAt: new Date().toISOString(),
        },
      ])
      setJSON(tenantId, ACTIVE, MAIN_BRANCH_ID)
    } else {
      persistBranches(next)
      if (activeBranchId === deleteId) {
        setJSON(tenantId, ACTIVE, next[0].id)
      }
    }
    refreshBranches()
    toast.success('Branch removed')
    setDeleteId(null)
  }

  function branchAccess(u, branchId) {
    const ids = u.branchIds
    if (!Array.isArray(ids) || ids.length === 0) return true
    return ids.includes(branchId)
  }

  function toggleUserBranch(u, branchId) {
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
    persistUsers(users.map((x) => (x.id === u.id ? { ...x, branchIds: next } : x)))
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
      {branches.length === 0 ? (
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
