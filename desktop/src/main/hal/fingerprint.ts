import { app } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import type { FingerprintEvent, FingerprintStatus } from '../../shared/ipc-contract'
import { IPC } from '../../shared/ipc-contract'
import { broadcastToWindows } from '../windows'

// Bridge to the .NET fingerprint helper (DigitalPersona U.are.U SDK is Windows
// COM/.NET only). The helper is a child process speaking JSON-lines over stdio:
//   -> {"cmd":"status"} | {"cmd":"enroll"} | {"cmd":"verify","templates":[{"userId","template"}]} | {"cmd":"cancel"}
//   <- {"event":"reader","connected":bool} | {"event":"sample","quality":"good"}
//      {"event":"enrolled","template":"<base64>"} | {"event":"match","userId":"..."}
//      {"event":"no-match"} | {"event":"error","message":"..."}

let child: ChildProcessWithoutNullStreams | null = null
let readerConnected = false
let unavailableReason: string | undefined

function helperPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'fingerprint-helper', 'FingerprintHelper.exe')
  }
  return path.resolve(__dirname, '../../..', 'fingerprint-helper', 'bin', 'Release', 'net8.0', 'FingerprintHelper.exe')
}

function emit(event: FingerprintEvent): void {
  if (event.type === 'reader') readerConnected = event.connected
  broadcastToWindows(IPC.FP_EVENT, event)
}

function ensureHelper(): ChildProcessWithoutNullStreams | null {
  if (child && !child.killed) return child
  if (process.platform !== 'win32') {
    unavailableReason = 'Fingerprint readers are supported on Windows only.'
    return null
  }
  const exe = helperPath()
  if (!fs.existsSync(exe)) {
    unavailableReason = 'Fingerprint helper is not installed (DigitalPersona SDK build missing).'
    return null
  }
  child = spawn(exe, [], { stdio: ['pipe', 'pipe', 'pipe'] })
  const rl = readline.createInterface({ input: child.stdout })
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line) as { event: string } & Record<string, unknown>
      switch (msg.event) {
        case 'reader':
          emit({ type: 'reader', connected: Boolean(msg.connected) })
          break
        case 'sample':
          emit({ type: 'sample', quality: String(msg.quality ?? 'unknown') })
          break
        case 'enrolled':
          emit({ type: 'enrolled', template: String(msg.template ?? '') })
          break
        case 'match':
          emit({ type: 'match', userId: String(msg.userId ?? '') })
          break
        case 'no-match':
          emit({ type: 'no-match' })
          break
        case 'error':
          emit({ type: 'error', message: String(msg.message ?? 'Fingerprint error') })
          break
      }
    } catch {
      /* ignore malformed helper output */
    }
  })
  child.on('exit', () => {
    child = null
    emit({ type: 'reader', connected: false })
  })
  return child
}

function send(cmd: Record<string, unknown>): boolean {
  const proc = ensureHelper()
  if (!proc) return false
  proc.stdin.write(JSON.stringify(cmd) + '\n')
  return true
}

export function fingerprintStatus(): FingerprintStatus {
  const available = ensureHelper() !== null
  return { available, readerConnected, reason: available ? undefined : unavailableReason }
}

export function startEnroll(): boolean {
  return send({ cmd: 'enroll' })
}

export function startVerify(templates: Array<{ userId: string; template: string }>): boolean {
  return send({ cmd: 'verify', templates })
}

export function cancelFingerprint(): void {
  send({ cmd: 'cancel' })
}

export function shutdownFingerprint(): void {
  if (child && !child.killed) child.kill()
  child = null
}
