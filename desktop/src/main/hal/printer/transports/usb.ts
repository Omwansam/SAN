import type { PrinterTransport } from './types'
import type { UsbDeviceInfo } from '../../../../shared/ipc-contract'

// Raw USB bulk transfer to the printer's OUT endpoint. On Windows this needs a
// WinUSB/libusb driver bound to the device (Zadig) if a vendor driver has
// claimed it — network/serial transports are the recommended defaults; this is
// the documented fallback. Loaded lazily like the other native modules.
type UsbModule = typeof import('usb')

function loadUsb(): UsbModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('usb') as UsbModule
}

const USB_CLASS_PRINTER = 0x07

export function usbTransport(vendorId: string, productId: string): PrinterTransport {
  const vid = parseInt(vendorId, 16)
  const pid = parseInt(productId, 16)
  return {
    name: `usb ${vendorId}:${productId}`,
    async write(data: Buffer): Promise<void> {
      const usb = loadUsb()
      const device = usb.findByIds(vid, pid)
      if (!device) throw new Error(`USB printer ${vendorId}:${productId} not found`)
      device.open()
      try {
        const iface =
          device.interfaces?.find((i) =>
            i.endpoints.some((e) => e.direction === 'out'),
          ) ?? device.interfaces?.[0]
        if (!iface) throw new Error('USB printer has no usable interface')
        if (process.platform !== 'win32' && iface.isKernelDriverActive()) {
          iface.detachKernelDriver()
        }
        iface.claim()
        const endpoint = iface.endpoints.find((e) => e.direction === 'out')
        if (!endpoint || endpoint.direction !== 'out') {
          throw new Error('USB printer has no bulk OUT endpoint')
        }
        await new Promise<void>((resolve, reject) => {
          ;(endpoint as import('usb').OutEndpoint).transfer(data, (err) =>
            err ? reject(new Error(`USB write failed: ${err.message}`)) : resolve(),
          )
        })
        await new Promise<void>((resolve) => iface.release(true, () => resolve()))
      } finally {
        try {
          device.close()
        } catch {
          /* already closed */
        }
      }
    },
  }
}

export function listUsbDevices(): UsbDeviceInfo[] {
  const usb = loadUsb()
  return usb.getDeviceList().map((d) => {
    const desc = d.deviceDescriptor
    const isPrinterClass =
      desc.bDeviceClass === USB_CLASS_PRINTER ||
      (d.configDescriptor?.interfaces ?? []).some((alts) =>
        alts.some((alt) => alt.bInterfaceClass === USB_CLASS_PRINTER),
      )
    return {
      vendorId: desc.idVendor.toString(16).padStart(4, '0'),
      productId: desc.idProduct.toString(16).padStart(4, '0'),
      isPrinterClass,
    }
  })
}
