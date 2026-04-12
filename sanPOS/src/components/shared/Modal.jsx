import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName = '',
  /** Omit default title row + close (custom layouts e.g. receipt success). */
  bare = false,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-gray-900 ${contentClassName}`}
          aria-describedby={description ? 'modal-desc' : undefined}
        >
          {!bare ? (
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description
                    id="modal-desc"
                    className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                  >
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
          ) : (
            <Dialog.Title className="sr-only">{title || 'Dialog'}</Dialog.Title>
          )}
          {children}
          {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
