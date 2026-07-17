# SanPOS Desktop (Windows)

Electron shell around the `sanPOS/` React app: NSIS installer, auto-update,
offline-first SQLite sync, and POS hardware — ESC/POS thermal printers
(USB / network / Bluetooth-COM / serial), cash-drawer kick, HID barcode
scanners, and DigitalPersona fingerprint readers.

## Architecture (short version)

- `src/main/` — Electron main process
  - `protocol.ts` serves the built sanPOS SPA from `app://pos` (SPA fallback,
    stable origin so localStorage + BroadcastChannel keep working)
  - `hal/` — hardware layer: `printer/` (ESC/POS via node-thermal-printer used
    as an encoder + our own transports), `drawer.ts`, `fingerprint.ts`
    (bridges the .NET helper)
  - `sync/` — offline layer: every renderer HTTP request funnels through
    `api-proxy.ts`; catalog GETs are cached in SQLite, sales/shifts/stock are
    queued in an outbox and replayed idempotently (`clientRef`) by `engine.ts`
- `src/preload/index.ts` — exposes `window.posBridge`; the React app gates all
  hardware on its presence (`sanPOS/src/utils/platform.js`)
- `fingerprint-helper/` — .NET 8 console app speaking JSON-lines over stdio
- Shared IPC types: `src/shared/ipc-contract.ts`

## Development (Linux/macOS/Windows)

```bash
# terminal 1 — renderer dev server
cd sanPOS && npm run dev

# terminal 2 — electron shell against it
cd desktop && npm install && npm run dev
```

First run: open Settings → Devices in the app and set **Server URL** and
**Workspace slug** (desktop clients send `x-workspace-slug`; there is no
subdomain).

## Windows installer

```bash
cd desktop
npm run dist        # builds sanPOS, bundles, produces release/SanPOS-Setup-*.exe
```

CI: `.github/workflows/desktop-release.yml` builds on `windows-latest` on tags
matching `desktop-v*`.

### Auto-updates

`electron-updater`, generic provider. Serve `desktop/release/latest.yml` + the
installer from the VPS (nginx `location /desktop-updates/ { ... }`) and set the
same URL in `electron-builder.yml` (`publish.url`) and, if different per
install, in the app's settings (`updatesUrl`). The app checks on launch and
every 4 h; a banner offers "Restart to update".

### Code signing (required for a clean install experience)

Unsigned builds trip Windows SmartScreen. Options:
- **Azure Trusted Signing** (~$10/mo, no hardware token) — wire into
  electron-builder via `azureSignOptions`
- OV/EV certificate from a CA (Sectigo/DigiCert), `CSC_LINK`/`CSC_KEY_PASSWORD`
  env vars in CI

## Hardware notes

**Printers — pick a transport in Settings → Devices:**
- **Network (recommended)**: any ESC/POS printer with Ethernet/WiFi, port 9100.
  No driver needed.
- **Serial / Bluetooth**: RS-232 printers, and classic Bluetooth SPP printers —
  pair in Windows Settings, then select the *outgoing* COM port. No driver
  needed. BLE-only printers are not supported; buy SPP or network models.
- **USB (raw)**: works when the device is bound to a WinUSB/libusb driver. If a
  vendor driver claims the printer, either use the vendor's network/serial mode
  or rebind with [Zadig](https://zadig.akeo.ie) (select the printer → WinUSB →
  Replace Driver). We deliberately do not print through the Windows spooler.
- Widths 58/80 mm and Epson/Star dialects are configurable. Test with
  "Print test page".

**Cash drawer**: plug the RJ11 into the receipt printer; the app fires the
ESC p kick pulse with each cash sale (and embeds it in the receipt job).
Direct-serial drawers are supported via a dedicated COM port (DTR pulse).

**Barcode scanners**: USB and Bluetooth scanners present as HID keyboards and
work with zero configuration — scans land in the cart even with nothing
focused. Camera scanning remains available for tablets.

**Fingerprint (DigitalPersona U.are.U 4500 family)**:
1. Buy/register the **DigitalPersona One Touch for Windows SDK** from HID
   Global (licensed download — start procurement early).
2. Drop `DPFPDevNET.dll`, `DPFPEngNET.dll`, `DPFPShrNET.dll`, `DPFPVerNET.dll`
   into `fingerprint-helper/libs/` (gitignored).
3. `dotnet publish -c Release -r win-x64 -o publish` in `fingerprint-helper/`.
   Without the DLLs a stub builds and the app reports fingerprint unavailable.
4. Install the DigitalPersona runtime (RTE) on each till.

Enrollment: Settings → Devices → "Enroll my fingerprint" (templates are stored
server-side per user and cached locally for offline matching). A recognized
manager fingerprint approves manager-override prompts; PIN remains the
fallback everywhere. Note: initial sign-in still uses email/password — a
fingerprint touch cannot mint a server session by design.

## Offline behaviour

- Catalog (products, categories, customers, tax rates, discounts, branches,
  users, shifts, orders lists) is served from the local SQLite cache when the
  server is unreachable.
- Sales, shift opens/closes, and stock movements are queued (`outbox`) and
  replayed in order when connectivity returns. `clientRef` idempotency on the
  backend guarantees exactly-once creation; offline shift ids referenced by
  queued orders are remapped after the shift syncs.
- Manager-PIN checks fall back to locally cached bcrypt hashes
  (`/api/users/offline-credentials`), encrypted at rest with DPAPI.
- eTIMS note: offline sales reach KRA at *sync* time; `createdAtClient` records
  the true sale time. Confirm acceptability with your KRA/eTIMS contact.

## Database migration

Backend changes require:

```bash
cd BACKEND && npx prisma migrate deploy && npx prisma generate
```

(Migration `20260717000000_desktop_offline_and_fingerprint` adds
`Order.clientRef/createdAtClient`, `Shift.clientRef`, `FingerprintTemplate`.)
