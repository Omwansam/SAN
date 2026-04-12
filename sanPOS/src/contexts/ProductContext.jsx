import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { getJSON, setJSON } from '../utils/storage'
import { useTenant } from './TenantContext'

const PRODUCTS_KEY = 'products'
const CATEGORIES_KEY = 'categories'

const ProductContext = createContext(null)

function productReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return {
        products: action.products ?? [],
        categories: action.categories ?? [],
      }
    case 'SET_PRODUCTS':
      return { ...state, products: action.products }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories }
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.product] }
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.product.id ? { ...p, ...action.product } : p,
        ),
      }
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.id),
      }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] }
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.category.id ? { ...c, ...action.category } : c,
        ),
      }
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
      }
    default:
      return state
  }
}

export function ProductProvider({ children }) {
  const { tenantId } = useTenant()
  const [state, dispatch] = useReducer(productReducer, {
    products: [],
    categories: [],
  })

  useEffect(() => {
    if (!tenantId) {
      dispatch({ type: 'HYDRATE', products: [], categories: [] })
      return
    }
    dispatch({
      type: 'HYDRATE',
      products: getJSON(tenantId, PRODUCTS_KEY, []),
      categories: getJSON(tenantId, CATEGORIES_KEY, []),
    })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    setJSON(tenantId, PRODUCTS_KEY, state.products)
  }, [tenantId, state.products])

  useEffect(() => {
    if (!tenantId) return
    setJSON(tenantId, CATEGORIES_KEY, state.categories)
  }, [tenantId, state.categories])

  const setProducts = useCallback((products) => {
    dispatch({ type: 'SET_PRODUCTS', products })
  }, [])

  const setCategories = useCallback((categories) => {
    dispatch({ type: 'SET_CATEGORIES', categories })
  }, [])

  const addProduct = useCallback((product) => {
    dispatch({ type: 'ADD_PRODUCT', product })
  }, [])

  const updateProduct = useCallback((product) => {
    dispatch({ type: 'UPDATE_PRODUCT', product })
  }, [])

  const deleteProduct = useCallback((id) => {
    dispatch({ type: 'DELETE_PRODUCT', id })
  }, [])

  const addCategory = useCallback((category) => {
    dispatch({ type: 'ADD_CATEGORY', category })
  }, [])

  const updateCategory = useCallback((category) => {
    dispatch({ type: 'UPDATE_CATEGORY', category })
  }, [])

  const deleteCategory = useCallback((id) => {
    dispatch({ type: 'DELETE_CATEGORY', id })
  }, [])

  const reloadFromStorage = useCallback(() => {
    if (!tenantId) return
    dispatch({
      type: 'HYDRATE',
      products: getJSON(tenantId, PRODUCTS_KEY, []),
      categories: getJSON(tenantId, CATEGORIES_KEY, []),
    })
  }, [tenantId])

  const value = useMemo(
    () => ({
      products: state.products,
      categories: state.categories,
      setProducts,
      setCategories,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      reloadFromStorage,
    }),
    [
      state.products,
      state.categories,
      setProducts,
      setCategories,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      reloadFromStorage,
    ],
  )

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProducts must be used within ProductProvider')
  return ctx
}
