/** Formats passed to the native BarcodeDetector API. */
export const BARCODE_SCAN_FORMATS = ['ean_13', 'ean_8', 'code_128', 'qr_code']

export function isBarcodeDetectorSupported() {
  return typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis
}
