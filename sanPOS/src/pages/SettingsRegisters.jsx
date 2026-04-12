import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { getJSON, setJSON } from '../utils/storage'
import { newId } from '../utils/uuid'

export default function SettingsRegisters() {
  const { tenantId, tenantConfig } = useTenant()
  const { can } = useAuth()
  const [regs, setRegs] = useState([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!tenantId) return
    queueMicrotask(() => setRegs(getJSON(tenantId, 'registers', [])))
  }, [tenantId])

  if (!tenantConfig) return null
  if (!can('registers')) return <Navigate to="/settings" replace />

  function persist(next) {
    if (!tenantId) return
    setJSON(tenantId, 'registers', next)
    setRegs(next)
  }

  function add() {
    if (!name.trim()) {
      toast.error('Name required')
      return
    }
    persist([
      ...regs,
      {
        id: newId(),
        tenantId,
        name: name.trim(),
        openingFloat: 0,
        currentFloat: 0,
        status: 'open',
        cashierId: null,
      },
    ])
    toast.success('Register added')
    setOpen(false)
    setName('')
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Registers
        </h1>
        <Button type="button" onClick={() => setOpen(true)}>
          Add register
        </Button>
      </div>
      {regs.length === 0 ? (
        <EmptyState title="No registers" />
      ) : (
        <ul className="space-y-2">
          {regs.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="font-medium">{r.name}</p>
              <p className="text-sm text-gray-500">Float: {r.currentFloat ?? 0}</p>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New register"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={add}>
              Save
            </Button>
          </>
        }
      >
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>
    </div>
  )
}
