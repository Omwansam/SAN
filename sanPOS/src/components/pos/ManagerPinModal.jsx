import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { Modal } from '../shared/Modal'
import { getJSON } from '../../utils/storage'

const MANAGER_ROLES = new Set(['manager', 'admin', 'superadmin'])

export function ManagerPinModal({ open, onOpenChange, tenantId, onApproved }) {
  const [pin, setPin] = useState('')

  function submit() {
    const p = pin.trim()
    if (!p || !tenantId) {
      toast.error('Enter a manager PIN.')
      return
    }
    const users = getJSON(tenantId, 'users', [])
    const list = Array.isArray(users) ? users : []
    const approver = list.find(
      (u) =>
        u.active !== false &&
        MANAGER_ROLES.has(u.role) &&
        String(u.pin ?? '') === p,
    )
    if (!approver) {
      toast.error('PIN did not match an active manager or admin.')
      return
    }
    setPin('')
    onOpenChange(false)
    onApproved({ id: approver.id, name: approver.name })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) setPin('')
        onOpenChange(o)
      }}
      title="Manager approval"
      description="A controlled-substance sale needs a manager PIN before checkout."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            Approve
          </Button>
        </>
      }
    >
      <Input
        id="mgr-pin"
        label="Manager PIN"
        type="password"
        autoComplete="one-time-code"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
    </Modal>
  )
}
