import { useContext } from 'react'
import { ProductContext } from '../contexts/product-context.shared'

export function useProducts() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProducts must be used within ProductProvider')
  return ctx
}
