import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { useTenant } from '../hooks/useTenant'
import { newId } from '../utils/uuid'

export default function Products() {
  const { tenantId, tenantConfig } = useTenant()
  const { can } = useAuth()
  const { products, categories, addProduct, updateProduct, deleteProduct } =
    useProducts()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [del, setDel] = useState(null)
  const stations = useMemo(
    () => tenantConfig?.kitchenStations ?? [],
    [tenantConfig],
  )

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: '',
    categoryId: '',
    stock: '0',
    imageUrl: '',
    kitchenStationId: '',
    controlled: false,
  })

  const reset = useCallback(
    (overrides = {}) => {
      setForm({
        name: overrides.name ?? '',
        sku: overrides.sku ?? '',
        barcode: overrides.barcode ?? '',
        price: overrides.price ?? '',
        categoryId: overrides.categoryId ?? categories[0]?.id ?? '',
        stock: overrides.stock ?? '0',
        imageUrl: overrides.imageUrl ?? '',
        kitchenStationId: overrides.kitchenStationId ?? stations[0]?.id ?? '',
        controlled: overrides.controlled ?? false,
      })
      setEditing(null)
    },
    [categories, stations],
  )

  const openNew = () => {
    reset()
    setOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      price: String(p.price),
      categoryId: p.categoryId ?? '',
      stock: String(p.stock ?? 0),
      imageUrl: p.imageUrl ?? '',
      kitchenStationId: p.kitchenStationId ?? stations[0]?.id ?? '',
      controlled: Boolean(p.controlled),
    })
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim()) {
      toast.error('Name required')
      return
    }
    const payload = {
      id: editing?.id ?? newId(),
      tenantId,
      name: form.name.trim(),
      description: editing?.description ?? '',
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      categoryId: form.categoryId || categories[0]?.id,
      price: Number(form.price) || 0,
      costPrice: editing?.costPrice ?? 0,
      taxable: editing?.taxable !== false,
      imageUrl: form.imageUrl || editing?.imageUrl || '',
      stock: Number(form.stock) || 0,
      lowStockAlert: editing?.lowStockAlert ?? 5,
      unit: editing?.unit ?? 'ea',
      variants: editing?.variants ?? [],
      active: true,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      kitchenStationId: form.kitchenStationId || stations[0]?.id || '',
      controlled:
        tenantConfig?.modules?.prescriptions && Boolean(form.controlled),
    }
    if (editing) updateProduct(payload)
    else addProduct(payload)
    toast.success('Saved')
    setOpen(false)
    reset()
  }

  const onImage = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () =>
      setForm((prev) => ({ ...prev, imageUrl: String(r.result ?? '') }))
    r.readAsDataURL(f)
  }

  const list = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  )

  useEffect(() => {
    const raw = location.state?.prefillBarcode
    if (!tenantId || !raw) return
    const decoded = String(raw).trim()
    if (!decoded) return
    if (!can('catalog')) return
    const guardKey = `sanpos:prefillBarcode:${tenantId}:${decoded}`
    if (sessionStorage.getItem(guardKey)) return
    sessionStorage.setItem(guardKey, '1')
    window.setTimeout(() => {
      reset({ barcode: decoded })
      setOpen(true)
      sessionStorage.removeItem(guardKey)
      navigate('.', { replace: true, state: {} })
    }, 0)
  }, [location.state, tenantId, reset, can, navigate])

  const canEdit = can('catalog')
  if (!tenantId || !tenantConfig) return null
  if (!canEdit) return <Navigate to="/pos" replace />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Products
        </h1>
        <Button type="button" onClick={openNew} aria-label="Add product">
          <Plus className="mr-1 inline h-4 w-4" />
          Add product
        </Button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No products" action={<Button onClick={openNew}>Add one</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 w-16" aria-label="Image" />
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3">{p.price}</td>
                  <td className="px-4 py-3">{p.stock ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-2 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => openEdit(p)}
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => setDel(p.id)}
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit product' : 'New product'}
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
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input
            label="Barcode"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder="EAN / UPC / Code 128"
            autoComplete="off"
          />
          <Input label="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
            <select
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Input label="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          {tenantConfig?.modules?.kitchenDisplay && stations.length ? (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kitchen station
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                value={form.kitchenStationId}
                onChange={(e) => setForm({ ...form, kitchenStationId: e.target.value })}
                aria-label="Kitchen station"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {tenantConfig?.modules?.prescriptions ? (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.controlled}
                onChange={(e) => setForm({ ...form, controlled: e.target.checked })}
                aria-label="Controlled substance"
              />
              Controlled substance (Rx demo)
            </label>
          ) : null}
          <Input
            label="Image URL (optional)"
            placeholder="https://…"
            value={form.imageUrl?.startsWith('data:') ? '' : form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            aria-label="Image URL"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste a link, or upload a file below (upload replaces URL).
          </p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Image file
            <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={onImage} />
          </label>
          {form.imageUrl ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <img
                src={form.imageUrl}
                alt="Preview"
                className="mx-auto max-h-40 w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(del)}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete product?"
        description="This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (del) deleteProduct(del)
          toast.success('Deleted')
          setDel(null)
        }}
      />
    </div>
  )
}
