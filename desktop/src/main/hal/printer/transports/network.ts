import net from 'node:net'
import type { PrinterTransport } from './types'

// Raw TCP 9100 ("JetDirect") — the most reliable ESC/POS path and the
// recommended default for counter printers and kitchen printers.
export function networkTransport(host: string, port: number, timeoutMs = 7000): PrinterTransport {
  return {
    name: `network ${host}:${port}`,
    write(data: Buffer): Promise<void> {
      return new Promise((resolve, reject) => {
        const socket = new net.Socket()
        let settled = false
        const fail = (err: Error) => {
          if (settled) return
          settled = true
          socket.destroy()
          reject(err)
        }
        socket.setTimeout(timeoutMs, () => fail(new Error(`Printer connection timed out (${host}:${port})`)))
        socket.once('error', (err) => fail(new Error(`Printer connection failed: ${err.message}`)))
        socket.connect(port, host, () => {
          socket.end(data, () => {
            if (settled) return
            settled = true
            resolve()
          })
        })
      })
    },
  }
}
