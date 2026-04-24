import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { getJSON, setJSON } from '../utils/storage'
import { apiRequest } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
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
  const { currentUser } = useAuth()
  const [state, dispatch] = useReducer(productReducer, {
    products: [],
    categories: [],
  })

  const loadCatalog = useCallback(async () => {
    if (!tenantId) {
      dispatch({ type: 'HYDRATE', products: [], categories: [] })
      return
    }
    const token = currentUser?.token || null
    if (!token) {
      dispatch({
        type: 'HYDRATE',
        products: getJSON(tenantId, PRODUCTS_KEY, []),
        categories: getJSON(tenantId, CATEGORIES_KEY, []),
      })
      return
    }
    const workspace = `?workspace=${encodeURIComponent(tenantId)}`
    const [productsRes, categoriesRes] = await Promise.all([
      apiRequest(`/api/products${workspace}`, { token }),
      apiRequest(`/api/categories${workspace}`, { token }),
    ])
    dispatch({
      type: 'HYDRATE',
      products: Array.isArray(productsRes?.data) ? productsRes.data : [],
      categories: Array.isArray(categoriesRes?.data) ? categoriesRes.data : [],
    })
  }, [tenantId, currentUser?.token])

  useEffect(() => {
    loadCatalog().catch(() => {
      if (!tenantId) return
      dispatch({
        type: 'HYDRATE',
        products: getJSON(tenantId, PRODUCTS_KEY, []),
        categories: getJSON(tenantId, CATEGORIES_KEY, []),
      })
    })
  }, [tenantId, loadCatalog])

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

  const addProduct = useCallback(
    async (product) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'ADD_PRODUCT', product })
        return product
      }
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const payload = {
        name: product?.name,
        description: product?.description,
        sku: product?.sku,
        barcode: product?.barcode,
        categoryId: product?.categoryId,
        taxRateId: product?.taxRateId,
        price: product?.price,
        costPrice: product?.costPrice,
        taxable: product?.taxable,
        imageUrl: product?.imageUrl,
        stock: product?.stock,
        lowStockAlert: product?.lowStockAlert,
        unit: product?.unit,
        variants: product?.variants,
        active: product?.active,
        controlled: product?.controlled,
        kitchenStationId: product?.kitchenStationId,
      }
      const res = await apiRequest(`/api/products${workspace}`, {
        method: 'POST',
        body: payload,
        token,
      })
      const saved = res?.data || product
      dispatch({ type: 'ADD_PRODUCT', product: saved })
      return saved
    },
    [tenantId, currentUser?.token],
  )

  const updateProduct = useCallback(
    async (product) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'UPDATE_PRODUCT', product })
        return product
      }
      const id = product?.id
      if (!id) throw new Error('Product ID is required for update.')
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const payload = {
        name: product?.name,
        description: product?.description,
        sku: product?.sku,
        barcode: product?.barcode,
        categoryId: product?.categoryId,
        taxRateId: product?.taxRateId,
        price: product?.price,
        costPrice: product?.costPrice,
        taxable: product?.taxable,
        imageUrl: product?.imageUrl,
        stock: product?.stock,
        lowStockAlert: product?.lowStockAlert,
        unit: product?.unit,
        variants: product?.variants,
        active: product?.active,
        controlled: product?.controlled,
        kitchenStationId: product?.kitchenStationId,
      }
      const res = await apiRequest(`/api/products/${encodeURIComponent(id)}${workspace}`, {
        method: 'PUT',
        body: payload,
        token,
      })
      const saved = res?.data || product
      dispatch({ type: 'UPDATE_PRODUCT', product: saved })
      return saved
    },
    [tenantId, currentUser?.token],
  )

  const deleteProduct = useCallback(
    async (id) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'DELETE_PRODUCT', id })
        return
      }
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      await apiRequest(`/api/products/${encodeURIComponent(id)}${workspace}`, {
        method: 'DELETE',
        token,
      })
      dispatch({ type: 'DELETE_PRODUCT', id })
    },
    [tenantId, currentUser?.token],
  )

  const addCategory = useCallback(
    async (category) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'ADD_CATEGORY', category })
        return category
      }
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const res = await apiRequest(`/api/categories${workspace}`, {
        method: 'POST',
        body: {
          name: category?.name,
          color: category?.color,
          icon: category?.icon,
          sortOrder: category?.sortOrder,
        },
        token,
      })
      const saved = res?.data || category
      dispatch({ type: 'ADD_CATEGORY', category: saved })
      return saved
    },
    [tenantId, currentUser?.token],
  )

  const updateCategory = useCallback(
    async (category) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'UPDATE_CATEGORY', category })
        return category
      }
      const id = category?.id
      if (!id) throw new Error('Category ID is required for update.')
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      const res = await apiRequest(`/api/categories/${encodeURIComponent(id)}${workspace}`, {
        method: 'PUT',
        body: {
          name: category?.name,
          color: category?.color,
          icon: category?.icon,
          sortOrder: category?.sortOrder,
        },
        token,
      })
      const saved = res?.data || category
      dispatch({ type: 'UPDATE_CATEGORY', category: saved })
      return saved
    },
    [tenantId, currentUser?.token],
  )

  const deleteCategory = useCallback(
    async (id) => {
      const token = currentUser?.token || null
      if (!tenantId || !token) {
        dispatch({ type: 'DELETE_CATEGORY', id })
        return
      }
      const workspace = `?workspace=${encodeURIComponent(tenantId)}`
      await apiRequest(`/api/categories/${encodeURIComponent(id)}${workspace}`, {
        method: 'DELETE',
        token,
      })
      dispatch({ type: 'DELETE_CATEGORY', id })
    },
    [tenantId, currentUser?.token],
  )

  const reloadFromStorage = useCallback(() => loadCatalog(), [loadCatalog])

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
