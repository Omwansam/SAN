import QRCode from 'qrcode'

// Local QR generation (replaces the old api.qrserver.com call, which broke
// offline and inside the desktop shell). Returns a data URL for <img src>.
export async function qrDataUrl(payload) {
  if (!payload) return null
  try {
    return await QRCode.toDataURL(payload, { width: 140, margin: 1 })
  } catch {
    return null
  }
}
