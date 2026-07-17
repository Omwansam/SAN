export interface PrinterTransport {
  readonly name: string
  write(data: Buffer): Promise<void>
}
