import { app, net, protocol } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const APP_SCHEME = 'app'
export const APP_HOST = 'pos'
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

// Must run before app ready.
export function registerSchemePrivileges() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ])
}

export function rendererRoot(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'renderer')
  // out/main/index.js -> desktop/out/main -> repo root -> sanPOS/dist
  return path.resolve(__dirname, '../../..', 'sanPOS', 'dist')
}

// Serves the built sanPOS SPA from app://pos with index.html fallback so
// BrowserRouter deep links and reloads work under a stable origin.
export function registerAppProtocol() {
  const root = rendererRoot()
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url)
    if (url.host !== APP_HOST) return new Response('Not found', { status: 404 })
    const pathname = decodeURIComponent(url.pathname)
    const resolved = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
    const safe =
      resolved.startsWith(root + path.sep) || resolved === path.join(root, 'index.html')
    const exists = safe && fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    const file = exists ? resolved : path.join(root, 'index.html')
    if (!exists && path.extname(pathname) && pathname !== '/') {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(file).toString())
  })
}
