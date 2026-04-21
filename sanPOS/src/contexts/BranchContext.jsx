import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { useAuth } from './AuthContext'
import { useTenant } from './TenantContext'
import {
  ensureBranchesInStorage,
  userMayAccessBranch,
} from '../utils/defaultBranches'
import { getJSON, setJSON } from '../utils/storage'

const BRANCHES_KEY = 'branches'
const ACTIVE_KEY = 'activeBranchId'

const BranchContext = createContext(null)

function branchReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return {
        branches: action.branches ?? [],
        activeBranchId: action.activeBranchId ?? null,
      }
    default:
      return state
  }
}

function resolveActiveForUser(tenantId, branches, activeBranchId, currentUser) {
  let active = activeBranchId
  if (
    currentUser &&
    active &&
    !userMayAccessBranch(currentUser, active)
  ) {
    active =
      branches.find((b) => userMayAccessBranch(currentUser, b.id))?.id ??
      branches[0]?.id ??
      null
    if (active) setJSON(tenantId, ACTIVE_KEY, active)
  }
  return active
}

export function BranchProvider({ children }) {
  const { tenantId } = useTenant()
  const { currentUser } = useAuth()
  const [state, dispatch] = useReducer(branchReducer, {
    branches: [],
    activeBranchId: null,
  })

  const refreshBranches = useCallback(() => {
    if (!tenantId) {
      dispatch({ type: 'SET', branches: [], activeBranchId: null })
      return
    }
    const { branches, activeBranchId } = ensureBranchesInStorage(tenantId)
    const active = resolveActiveForUser(
      tenantId,
      branches,
      activeBranchId,
      currentUser,
    )
    dispatch({ type: 'SET', branches, activeBranchId: active })
  }, [tenantId, currentUser])

  useEffect(() => {
    refreshBranches()
  }, [refreshBranches])

  const setActiveBranchId = useCallback(
    (branchId) => {
      if (!tenantId || !branchId) return
      if (currentUser && !userMayAccessBranch(currentUser, branchId)) return
      const branches = getJSON(tenantId, BRANCHES_KEY, [])
      if (!Array.isArray(branches) || !branches.some((b) => b.id === branchId)) return
      setJSON(tenantId, ACTIVE_KEY, branchId)
      dispatch({ type: 'SET', branches, activeBranchId: branchId })
    },
    [tenantId, currentUser],
  )

  const activeBranch = useMemo(
    () => state.branches.find((b) => b.id === state.activeBranchId) ?? null,
    [state.branches, state.activeBranchId],
  )

  const value = useMemo(
    () => ({
      branches: state.branches,
      activeBranchId: state.activeBranchId,
      activeBranch,
      setActiveBranchId,
      refreshBranches,
    }),
    [
      state.branches,
      state.activeBranchId,
      activeBranch,
      setActiveBranchId,
      refreshBranches,
    ],
  )

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used within BranchProvider')
  return ctx
}
