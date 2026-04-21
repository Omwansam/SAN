import { getJSON, setJSON } from './storage'

export const MAIN_BRANCH_ID = 'main'

/**
 * Ensures at least one branch exists and activeBranchId is valid.
 * @param {string} tenantId
 */
export function ensureBranchesInStorage(tenantId) {
  if (!tenantId) {
    return { branches: [], activeBranchId: null }
  }
  let branches = getJSON(tenantId, 'branches', [])
  if (!Array.isArray(branches)) branches = []
  if (branches.length === 0) {
    branches = [
      {
        id: MAIN_BRANCH_ID,
        name: 'Main',
        address: '',
        createdAt: new Date().toISOString(),
      },
    ]
    setJSON(tenantId, 'branches', branches)
  }
  let activeBranchId = getJSON(tenantId, 'activeBranchId', null)
  if (!activeBranchId || !branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = branches[0].id
    setJSON(tenantId, 'activeBranchId', activeBranchId)
  }
  return { branches, activeBranchId }
}

/**
 * @param {object|null|undefined} user
 * @param {string} branchId
 * @returns {boolean}
 */
export function userMayAccessBranch(user, branchId) {
  if (!branchId) return false
  const ids = user?.branchIds
  if (!Array.isArray(ids) || ids.length === 0) return true
  return ids.includes(branchId)
}
