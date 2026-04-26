import { Navigate, useParams } from 'react-router-dom'
import { getPlatformTenantById, getTenantUsers } from '../utils/platformData'

export default function PlatformTenantUsers() {
  const { tenantId } = useParams()
  const tenant = getPlatformTenantById(tenantId)
  if (!tenant) return <Navigate to="/platform/tenants" replace />
  const users = getTenantUsers(tenantId)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{tenant.businessName} · Users & roles</h1>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/50">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-sm text-white">{user.name || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{user.email || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{user.role || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{user.active === false ? 'No' : 'Yes'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
