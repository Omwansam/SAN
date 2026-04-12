import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react'

const UIContext = createContext(null)

function uiReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.open }
    case 'SET_ACTIVE_MODULE':
      return { ...state, activeModule: action.module }
    case 'ADD_TOAST': {
      const id = crypto.randomUUID()
      return {
        ...state,
        toasts: [...state.toasts, { id, ...action.payload }],
      }
    }
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    case 'CLEAR_TOASTS':
      return { ...state, toasts: [] }
    default:
      return state
  }
}

export function UIProvider({ children }) {
  const [state, dispatch] = useReducer(uiReducer, {
    sidebarOpen: true,
    activeModule: null,
    toasts: [],
  })

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [])

  const setSidebarOpen = useCallback((open) => {
    dispatch({ type: 'SET_SIDEBAR', open })
  }, [])

  const setActiveModule = useCallback((module) => {
    dispatch({ type: 'SET_ACTIVE_MODULE', module })
  }, [])

  const pushToast = useCallback((toast) => {
    dispatch({ type: 'ADD_TOAST', payload: toast })
  }, [])

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', id })
  }, [])

  const clearToasts = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' })
  }, [])

  const value = useMemo(
    () => ({
      sidebarOpen: state.sidebarOpen,
      activeModule: state.activeModule,
      toasts: state.toasts,
      toggleSidebar,
      setSidebarOpen,
      setActiveModule,
      pushToast,
      removeToast,
      clearToasts,
    }),
    [
      state.sidebarOpen,
      state.activeModule,
      state.toasts,
      toggleSidebar,
      setSidebarOpen,
      setActiveModule,
      pushToast,
      removeToast,
      clearToasts,
    ],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
