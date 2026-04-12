import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button'
import { useEffect, useRef } from 'react'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  danger,
}) {
  const confirmRef = useRef(null)
  useEffect(() => {
    if (open) confirmRef.current?.focus?.()
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-gray-900"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </Dialog.Title>
          {description ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef}
              type="button"
              className={danger ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => {
                onConfirm?.()
                onOpenChange(false)
              }}
              aria-label={confirmLabel}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
