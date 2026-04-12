import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { useTenant } from '../hooks/useTenant'
import { newId } from '../utils/uuid'

export default function Categories() {
  const { tenantId, tenantConfig } = useTenant()
  const { can } = useAuth()
  const { categories, addCategory, deleteCategory } = useProducts()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [del, setDel] = useState(null)

  if (!tenantId || !tenantConfig) return null
  if (!can('catalog')) return <Navigate to="/pos" replace />

  const save = () => {
    if (!name.trim()) {
      toast.error('Name required')
      return
    }
    addCategory({
      id: newId(),
      tenantId,
      name: name.trim(),
      color,
      icon: 'tag',
      sortOrder: categories.length,
    })
    toast.success('Category added')
    setOpen(false)
    setName('')
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Categories
        </h1>
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-1 inline h-4 w-4" />
          Add
        </Button>
      </div>
      {categories.length === 0 ? (
        <EmptyState title="No categories" />
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-hidden
                />
                <span className="font-medium">{c.name}</span>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                onClick={() => setDel(c.id)}
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New category"
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
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Color
          <input
            type="color"
            className="mt-1 h-10 w-24 cursor-pointer rounded border-0"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Category color"
          />
        </label>
      </Modal>
      <ConfirmDialog
        open={Boolean(del)}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete category?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (del) deleteCategory(del)
          setDel(null)
          toast.success('Removed')
        }}
      />
    </div>
  )
}
