import { useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { formatCurrency } from '../utils/currency'
import { useAuth } from '../hooks/useAuth'
import { useCustomers } from '../hooks/useCustomers'
import { useTenant } from '../hooks/useTenant'

export default function Customers() {
  const { tenantConfig } = useTenant()
  const { can } = useAuth()
  const { customers, updateCustomer, deleteCustomer } = useCustomers()
  const [edit, setEdit] = useState(null)
  const [pts, setPts] = useState('0')
  const [del, setDel] = useState(null)

  if (!tenantConfig) return null
  if (!can('customer_lookup')) return <Navigate to="/pos" replace />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Customers
      </h1>
      {customers.length === 0 ? (
        <EmptyState title="No customers" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/80">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Loyalty</th>
                <th className="px-4 py-3">Spend</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.loyaltyPoints ?? 0}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(c.totalSpend ?? 0, tenantConfig)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!py-1 !px-3 text-xs"
                      onClick={() => {
                        setEdit(c)
                        setPts(String(c.loyaltyPoints ?? 0))
                      }}
                    >
                      Points
                    </Button>
                    {can('settings') ? (
                      <button
                        type="button"
                        className="ml-2 text-xs text-red-600"
                        onClick={() => setDel(c.id)}
                        aria-label={`Delete ${c.name}`}
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={Boolean(edit)}
        onOpenChange={(o) => !o && setEdit(null)}
        title="Loyalty points"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!edit) return
                updateCustomer({ ...edit, loyaltyPoints: Number(pts) || 0 })
                toast.success('Updated')
                setEdit(null)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Points"
          type="number"
          value={pts}
          onChange={(e) => setPts(e.target.value)}
          aria-label="Loyalty points"
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(del)}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete customer?"
        danger
        confirmLabel="Delete"
        onConfirm={() => {
          if (del) deleteCustomer(del)
          toast.success('Removed')
          setDel(null)
        }}
      />
    </div>
  )
}
