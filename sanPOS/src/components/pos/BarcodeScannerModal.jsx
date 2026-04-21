import { useCallback, useId } from 'react'
import { BarcodeScanner } from './BarcodeScanner'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'

/**
 * Modal shell for {@link BarcodeScanner}. Parent handles catalog lookup + cart.
 */
export function BarcodeScannerModal({
  open,
  onOpenChange,
  onDetected,
  /** Controlled: continuous scan keeps camera open after each read. */
  continuous = false,
  onContinuousChange,
}) {
  const id = useId()

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const setContinuous = onContinuousChange ?? (() => {})

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Scan barcode"
      contentClassName="max-h-[min(92dvh,720px)] w-[min(100vw-1rem,36rem)] max-w-[calc(100vw-1rem)] flex flex-col overflow-hidden max-sm:max-h-[92dvh]"
      footer={
        <Button type="button" variant="secondary" onClick={handleClose}>
          Done
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Point the camera at a barcode (EAN-8/13, Code 128, QR). Uses your device
          camera — data stays on this device.
        </p>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            id={`${id}-continuous`}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]"
            checked={continuous}
            onChange={(e) => setContinuous(e.target.checked)}
          />
          Continuous scan (stay open after each item)
        </label>
        <BarcodeScanner
          active={open}
          onClose={handleClose}
          continuous={continuous}
          onDetected={onDetected}
        />
      </div>
    </Modal>
  )
}
