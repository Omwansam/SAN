import { getSettings } from '../settings'
import { drawerKickBuffer } from './printer/render-escpos'
import { sendRaw } from './printer/index'
import { pulseSerialLine } from './printer/transports/serial'

// Cash drawers almost always hang off the receipt printer's RJ11 port and open
// on an ESC p pulse; 'serial' mode covers direct-drive drawers on their own COM port.
export async function kickDrawer(): Promise<void> {
  const drawer = getSettings().devices.drawer
  if (drawer.mode === 'serial') {
    if (!drawer.comPort) throw new Error('Drawer COM port is not configured')
    await pulseSerialLine(drawer.comPort, drawer.baudRate || 9600)
    return
  }
  await sendRaw(drawerKickBuffer())
}
