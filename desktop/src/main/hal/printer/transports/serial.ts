import type { PrinterTransport } from './types'
import type { SerialPortInfo } from '../../../../shared/ipc-contract'

// Covers RS-232 printers AND classic Bluetooth SPP printers — Windows exposes a
// paired SPP printer as an outgoing virtual COM port, so no Bluetooth stack is
// needed here. Loaded lazily so a missing native build never breaks app startup.
type SerialPortModule = typeof import('serialport')

function loadSerialport(): SerialPortModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('serialport') as SerialPortModule
}

export function serialTransport(comPort: string, baudRate: number): PrinterTransport {
  return {
    name: `serial ${comPort}@${baudRate}`,
    write(data: Buffer): Promise<void> {
      const { SerialPort } = loadSerialport()
      return new Promise((resolve, reject) => {
        const port = new SerialPort({ path: comPort, baudRate, autoOpen: false })
        port.open((openErr) => {
          if (openErr) return reject(new Error(`Could not open ${comPort}: ${openErr.message}`))
          port.write(data, (writeErr) => {
            if (writeErr) {
              port.close(() => reject(new Error(`Write to ${comPort} failed: ${writeErr.message}`)))
              return
            }
            port.drain((drainErr) => {
              port.close(() =>
                drainErr
                  ? reject(new Error(`Flush to ${comPort} failed: ${drainErr.message}`))
                  : resolve(),
              )
            })
          })
        })
      })
    },
  }
}

export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  const { SerialPort } = loadSerialport()
  const ports = await SerialPort.list()
  return ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer,
    friendlyName: (p as { friendlyName?: string }).friendlyName,
  }))
}

// Direct-drive cash drawers on a dedicated COM port: pulse the DTR line.
export async function pulseSerialLine(comPort: string, baudRate: number): Promise<void> {
  const { SerialPort } = loadSerialport()
  await new Promise<void>((resolve, reject) => {
    const port = new SerialPort({ path: comPort, baudRate, autoOpen: false })
    port.open((openErr) => {
      if (openErr) return reject(new Error(`Could not open ${comPort}: ${openErr.message}`))
      port.set({ dtr: true, rts: true }, () => {
        setTimeout(() => {
          port.set({ dtr: false, rts: false }, () => port.close(() => resolve()))
        }, 200)
      })
    })
  })
}
