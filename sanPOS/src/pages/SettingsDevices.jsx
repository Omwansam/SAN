import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Fingerprint, Printer, RefreshCw } from 'lucide-react'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { apiRequest } from '../utils/api'
import { getBridge, isDesktop } from '../utils/platform'

const selectClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--brand)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

function Field({ label, children }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  )
}

// Device + connection settings for the desktop app (printer, cash drawer,
// server/workspace). Rendered only inside the Electron shell — the web build
// has no hardware bridge and shows a short explainer instead.
export default function SettingsDevices() {
  const { can, currentUser } = useAuth()
  const { tenantId } = useTenant()
  const bridge = getBridge()
  const [settings, setSettings] = useState(null)
  const [serialPorts, setSerialPorts] = useState([])
  const [usbDevices, setUsbDevices] = useState([])
  const [busy, setBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [fpStatus, setFpStatus] = useState(null)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    if (!bridge) return undefined
    bridge.config.get().then(setSettings)
    bridge.sync.status().then(setSyncStatus)
    bridge.fingerprint.status().then(setFpStatus)
    const unsubSync = bridge.sync.onStatus(setSyncStatus)
    const unsubFp = bridge.fingerprint.onEvent((event) => {
      if (event.type === 'reader') {
        setFpStatus((prev) => ({ ...(prev ?? { available: true }), readerConnected: event.connected }))
      }
    })
    return () => {
      unsubSync()
      unsubFp()
    }
  }, [bridge])

  const save = useCallback(
    async (patch) => {
      const next = await bridge.config.set(patch)
      setSettings(next)
      toast.success('Saved')
    },
    [bridge],
  )

  if (!can('settings')) return <Navigate to="/settings" replace />

  if (!isDesktop()) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Devices</h1>
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Receipt printers, cash drawers and fingerprint readers are managed by the SanPOS
          desktop app for Windows. Install it on the till machine to configure hardware here.
        </p>
      </div>
    )
  }

  if (!settings) return null
  const printer = settings.devices.printer
  const drawer = settings.devices.drawer

  const patchPrinter = (partial) =>
    save({ devices: { printer: { ...printer, ...partial } } })
  const patchDrawer = (partial) => save({ devices: { drawer: { ...drawer, ...partial } } })

  async function refreshPorts() {
    try {
      setSerialPorts(await bridge.printer.listSerialPorts())
      setUsbDevices(await bridge.printer.listUsbDevices())
    } catch (error) {
      toast.error(error?.message || 'Could not list devices')
    }
  }

  async function testPrint() {
    setBusy(true)
    try {
      await bridge.printer.testPrint()
      toast.success('Test page sent')
    } catch (error) {
      toast.error(error?.message || 'Test print failed')
    } finally {
      setBusy(false)
    }
  }

  async function testDrawer() {
    setBusy(true)
    try {
      await bridge.drawer.kick()
      toast.success('Drawer kick sent')
    } catch (error) {
      toast.error(error?.message || 'Drawer kick failed')
    } finally {
      setBusy(false)
    }
  }

  async function enrollFingerprint() {
    setEnrolling(true)
    const unsubscribe = bridge.fingerprint.onEvent(async (event) => {
      if (event.type === 'enrolled') {
        unsubscribe()
        setEnrolling(false)
        try {
          const workspace = tenantId ? `?workspace=${encodeURIComponent(tenantId)}` : ''
          await apiRequest(`/api/users/fingerprints${workspace}`, {
            method: 'POST',
            token: currentUser?.token,
            body: { template: event.template },
          })
          toast.success('Fingerprint enrolled')
        } catch (error) {
          toast.error(error?.message || 'Could not save fingerprint')
        }
      } else if (event.type === 'error') {
        unsubscribe()
        setEnrolling(false)
        toast.error(event.message)
      } else if (event.type === 'sample') {
        toast('Sample captured — touch again', { icon: '👆', id: 'fp-sample' })
      }
    })
    const started = await bridge.fingerprint.startEnroll()
    if (!started) {
      unsubscribe()
      setEnrolling(false)
      toast.error(fpStatus?.reason || 'Fingerprint reader unavailable')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Devices</h1>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Server connection</h2>
        <Field label="Server URL">
          <Input
            defaultValue={settings.serverUrl}
            placeholder="https://pos.yourdomain.com"
            onBlur={(e) => save({ serverUrl: e.target.value.trim() })}
          />
        </Field>
        <Field label="Workspace slug">
          <Input
            defaultValue={settings.workspaceSlug}
            placeholder="my-shop"
            onBlur={(e) => save({ workspaceSlug: e.target.value.trim() })}
          />
        </Field>
        {syncStatus ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-950">
            <span>
              {syncStatus.online ? 'Online' : 'Offline'} · {syncStatus.pendingCount} queued
              {syncStatus.failedCount > 0 ? ` · ${syncStatus.failedCount} failed` : ''}
              {syncStatus.lastSyncAt
                ? ` · last sync ${new Date(syncStatus.lastSyncAt).toLocaleTimeString()}`
                : ''}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => bridge.sync.syncNow().then(setSyncStatus)}
            >
              Sync now
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Receipt printer</h2>
          <Button type="button" variant="secondary" onClick={refreshPorts}>
            <RefreshCw className="mr-2 inline h-4 w-4" aria-hidden />
            Detect devices
          </Button>
        </div>
        <Field label="Connection">
          <select
            className={selectClass}
            value={printer.transport ?? ''}
            onChange={(e) => patchPrinter({ transport: e.target.value || null })}
          >
            <option value="">Not configured</option>
            <option value="network">Network (Ethernet/WiFi, port 9100)</option>
            <option value="serial">Serial / Bluetooth COM port</option>
            <option value="usb">USB (raw)</option>
          </select>
        </Field>

        {printer.transport === 'network' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Printer IP / host">
              <Input
                defaultValue={printer.host}
                placeholder="192.168.0.50"
                onBlur={(e) => patchPrinter({ host: e.target.value.trim() })}
              />
            </Field>
            <Field label="Port">
              <Input
                type="number"
                defaultValue={printer.port}
                onBlur={(e) => patchPrinter({ port: Number(e.target.value) || 9100 })}
              />
            </Field>
          </div>
        ) : null}

        {printer.transport === 'serial' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="COM port">
              <select
                className={selectClass}
                value={printer.comPort}
                onChange={(e) => patchPrinter({ comPort: e.target.value })}
              >
                <option value="">Select…</option>
                {serialPorts.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.friendlyName || p.path}
                  </option>
                ))}
                {printer.comPort && !serialPorts.some((p) => p.path === printer.comPort) ? (
                  <option value={printer.comPort}>{printer.comPort}</option>
                ) : null}
              </select>
            </Field>
            <Field label="Baud rate">
              <Input
                type="number"
                defaultValue={printer.baudRate}
                onBlur={(e) => patchPrinter({ baudRate: Number(e.target.value) || 9600 })}
              />
            </Field>
          </div>
        ) : null}

        {printer.transport === 'usb' ? (
          <Field label="USB printer">
            <select
              className={selectClass}
              value={`${printer.usbVendorId}:${printer.usbProductId}`}
              onChange={(e) => {
                const [usbVendorId, usbProductId] = e.target.value.split(':')
                patchPrinter({ usbVendorId: usbVendorId || '', usbProductId: usbProductId || '' })
              }}
            >
              <option value=":">Select…</option>
              {usbDevices
                .filter((d) => d.isPrinterClass)
                .map((d) => (
                  <option key={`${d.vendorId}:${d.productId}`} value={`${d.vendorId}:${d.productId}`}>
                    {d.vendorId}:{d.productId} (printer)
                  </option>
                ))}
              {usbDevices
                .filter((d) => !d.isPrinterClass)
                .map((d) => (
                  <option key={`${d.vendorId}:${d.productId}`} value={`${d.vendorId}:${d.productId}`}>
                    {d.vendorId}:{d.productId}
                  </option>
                ))}
            </select>
          </Field>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Paper width">
            <select
              className={selectClass}
              value={String(printer.widthMM)}
              onChange={(e) => patchPrinter({ widthMM: Number(e.target.value) })}
            >
              <option value="80">80 mm</option>
              <option value="58">58 mm</option>
            </select>
          </Field>
          <Field label="Command set">
            <select
              className={selectClass}
              value={printer.dialect}
              onChange={(e) => patchPrinter({ dialect: e.target.value })}
            >
              <option value="epson">ESC/POS (Epson & compatibles)</option>
              <option value="star">Star</option>
            </select>
          </Field>
        </div>

        <Button type="button" onClick={testPrint} disabled={busy || !printer.transport}>
          <Printer className="mr-2 inline h-4 w-4" aria-hidden />
          Print test page
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Cash drawer</h2>
        <Field label="Connection">
          <select
            className={selectClass}
            value={drawer.mode}
            onChange={(e) => patchDrawer({ mode: e.target.value })}
          >
            <option value="printer">Via receipt printer (RJ11 kick)</option>
            <option value="serial">Direct serial (COM port)</option>
          </select>
        </Field>
        {drawer.mode === 'serial' ? (
          <Field label="Drawer COM port">
            <select
              className={selectClass}
              value={drawer.comPort}
              onChange={(e) => patchDrawer({ comPort: e.target.value })}
            >
              <option value="">Select…</option>
              {serialPorts.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.friendlyName || p.path}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Button type="button" variant="secondary" onClick={testDrawer} disabled={busy}>
          Test drawer kick
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">At the till</h2>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Print receipt automatically after each sale</span>
          <input
            type="checkbox"
            checked={settings.devices.autoPrintOnSale}
            onChange={(e) => save({ devices: { autoPrintOnSale: e.target.checked } })}
            className="h-4 w-4"
          />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Open cash drawer on cash payments</span>
          <input
            type="checkbox"
            checked={settings.devices.kickDrawerOnCash}
            onChange={(e) => save({ devices: { kickDrawerOnCash: e.target.checked } })}
            className="h-4 w-4"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Fingerprint reader</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {fpStatus?.available
            ? fpStatus.readerConnected
              ? 'Reader connected. Enrolled fingerprints approve manager overrides at the till.'
              : 'Fingerprint helper is running, but no reader is connected.'
            : fpStatus?.reason ||
              'Requires a DigitalPersona U.are.U reader and the fingerprint helper (Windows).'}
        </p>
        <Button
          type="button"
          onClick={enrollFingerprint}
          disabled={!fpStatus?.available || enrolling}
        >
          <Fingerprint className="mr-2 inline h-4 w-4" aria-hidden />
          {enrolling ? 'Touch the sensor repeatedly…' : 'Enroll my fingerprint'}
        </Button>
      </section>
    </div>
  )
}
