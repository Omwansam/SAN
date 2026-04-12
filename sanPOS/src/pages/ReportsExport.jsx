import { useMemo } from 'react'
import { jsPDF } from 'jspdf'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { useTenant } from '../hooks/useTenant'

export default function ReportsExport() {
  const { tenantConfig } = useTenant()
  const { can } = useAuth()
  const { orders } = useOrders()

  const csv = useMemo(() => Papa.unparse(orders), [orders])

  if (!tenantConfig) return null
  if (!can('export')) return <Navigate to="/reports" replace />

  function download() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download started')
  }

  function downloadPdf() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 40
    let y = margin
    doc.setFontSize(14)
    doc.text('Orders export', margin, y)
    y += 28
    doc.setFontSize(9)
    const rows = orders.slice(0, 80)
    for (const o of rows) {
      const line = `${(o.id ?? '').slice(0, 12)}…  ${o.status ?? ''}  total ${o.total ?? 0}  ${(o.createdAt ?? '').slice(0, 10)}`
      doc.text(line, margin, y)
      y += 14
      if (y > 780) {
        doc.addPage()
        y = margin
      }
    }
    doc.save(`orders-export-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF saved')
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Export
      </h1>
      {orders.length === 0 ? (
        <EmptyState title="No orders to export" />
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={download} aria-label="Download CSV">
            Download orders as CSV
          </Button>
          <Button type="button" variant="secondary" onClick={downloadPdf} aria-label="Download PDF">
            Download summary PDF
          </Button>
        </div>
      )}
    </div>
  )
}
