import { UNIFIED_POS_LOGIN } from '../constants/demoCategoryWorkspaces'
import { ensureUnifiedDemoStaff } from './ensureUnifiedDemoStaff'
import { stockImageUrlForSeed } from './productStockImages'
import { getJSON, setJSON } from './storage'
import { newId } from './uuid'

const DEMO_PASSWORD = 'demo123'

function nowIso() {
  return new Date().toISOString()
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function catalogForType(businessType) {
  if (businessType === 'restaurant') {
    return {
      categories: [
        { id: 'c1', name: 'Mains', color: '#ef4444', icon: 'utensils', sortOrder: 0 },
        { id: 'c2', name: 'Sides', color: '#22c55e', icon: 'leaf', sortOrder: 1 },
        { id: 'c3', name: 'Drinks', color: '#3b82f6', icon: 'cup', sortOrder: 2 },
      ],
      products: [
        ['Grilled chicken', 850, 'c1'],
        ['Beef stew', 720, 'c1'],
        ['Fish fillet', 950, 'c1'],
        ['Vegetable curry', 480, 'c1'],
        ['Ugali portion', 80, 'c2'],
        ['Chapati', 50, 'c2'],
        ['Rice bowl', 120, 'c2'],
        ['Kachumbari', 90, 'c2'],
        ['Fresh juice', 150, 'c3'],
        ['Soda 500ml', 100, 'c3'],
        ['Mineral water', 60, 'c3'],
        ['Masala chai', 80, 'c3'],
      ],
    }
  }
  if (businessType === 'pharmacy') {
    return {
      categories: [
        { id: 'c1', name: 'OTC', color: '#22c55e', icon: 'pill', sortOrder: 0 },
        { id: 'c2', name: 'Prescription', color: '#ef4444', icon: 'shield', sortOrder: 1 },
        { id: 'c3', name: 'Wellness', color: '#3b82f6', icon: 'heart', sortOrder: 2 },
      ],
      products: [
        ['Paracetamol 500mg', 120, 'c1'],
        ['Ibuprofen 400mg', 180, 'c1'],
        ['Antacid tablets', 95, 'c1'],
        ['ORS sachets', 60, 'c1'],
        ['Amoxicillin 500mg', 320, 'c2', { controlled: true }],
        ['Azithromycin 250mg', 540, 'c2', { controlled: true }],
        ['Cough syrup 200ml', 210, 'c1'],
        ['Saline nasal spray', 140, 'c1'],
        ['Vitamin D3', 260, 'c3'],
        ['Omega-3 capsules', 890, 'c3'],
        ['Zinc tablets', 310, 'c3'],
        ['First aid kit', 1200, 'c3'],
      ],
    }
  }
  if (businessType === 'salon') {
    return {
      categories: [
        { id: 'c1', name: 'Hair', color: '#a855f7', icon: 'scissors', sortOrder: 0 },
        { id: 'c2', name: 'Nails', color: '#ec4899', icon: 'sparkles', sortOrder: 1 },
        { id: 'c3', name: 'Spa', color: '#14b8a6', icon: 'droplet', sortOrder: 2 },
      ],
      products: [
        ['Cut & blowdry', 1200, 'c1'],
        ['Colour treatment', 3500, 'c1'],
        ['Kids haircut', 600, 'c1'],
        ['Beard trim', 400, 'c1'],
        ['Manicure', 900, 'c2'],
        ['Pedicure', 1100, 'c2'],
        ['Gel polish', 1500, 'c2'],
        ['Nail art add-on', 300, 'c2'],
        ['Facial 45m', 2200, 'c3'],
        ['Head massage', 800, 'c3'],
        ['Steam treatment', 600, 'c3'],
        ['Waxing session', 1300, 'c3'],
      ],
    }
  }
  return {
    categories: [
      { id: 'c1', name: 'Apparel', color: '#6366f1', icon: 'shirt', sortOrder: 0 },
      { id: 'c2', name: 'Electronics', color: '#f97316', icon: 'cpu', sortOrder: 1 },
      { id: 'c3', name: 'Groceries', color: '#84cc16', icon: 'basket', sortOrder: 2 },
    ],
    products: [
      ['Cotton tee', 890, 'c1'],
      ['Denim jeans', 2400, 'c1'],
      ['Hoodie', 1800, 'c1'],
      ['Running shoes', 5200, 'c1'],
      ['USB-C cable', 450, 'c2'],
      ['Power bank 10k', 3200, 'c2'],
      ['Earbuds', 1500, 'c2'],
      ['Desk lamp', 2100, 'c2'],
      ['Rice 2kg', 380, 'c3'],
      ['Cooking oil 1L', 290, 'c3'],
      ['Sugar 1kg', 160, 'c3'],
      ['Tea leaves 250g', 220, 'c3'],
    ],
  }
}

/**
 * Populates demo categories, products, users, orders, customers, registers.
 * @param {string} tenantId
 * @param {string} businessType
 */
export async function seedTenant(tenantId, businessType = 'retail') {
  const { categories: catDefs, products: prodDefs } = catalogForType(businessType)

  const categories = catDefs.map((c) => ({
    ...c,
    tenantId,
  }))

  const kitchenByCat =
    businessType === 'restaurant'
      ? { c1: 'hot', c2: 'cold', c3: 'bar' }
      : businessType === 'pharmacy'
        ? { c1: 'cold', c2: 'cold', c3: 'cold' }
        : { c1: 'hot', c2: 'cold', c3: 'bar' }

  const products = prodDefs.map((def, i) => {
    const name = def[0]
    const price = def[1]
    const categoryId = def[2]
    const meta =
      typeof def[3] === 'object' && def[3] !== null && !Array.isArray(def[3])
        ? def[3]
        : {}
    return {
      id: newId(),
      tenantId,
      name,
      description: '',
      sku: `SKU-${i + 1}`,
      barcode: '',
      categoryId,
      price,
      costPrice: Math.round(price * 0.55),
      taxable: true,
      imageUrl: stockImageUrlForSeed(businessType, i),
      stock: 50 + i * 3,
      lowStockAlert: 5,
      unit: 'ea',
      variants: [],
      active: true,
      createdAt: nowIso(),
      controlled: Boolean(meta.controlled),
      kitchenStationId: meta.kitchenStationId || kitchenByCat[categoryId] || 'hot',
    }
  })

  setJSON(tenantId, 'categories', categories)
  setJSON(tenantId, 'products', products)

  await ensureUnifiedDemoStaff(tenantId)
  const savedUsers = getJSON(tenantId, 'users', [])
  const cashierEmail = String(UNIFIED_POS_LOGIN.cashierEmail).toLowerCase()
  const cashierRec =
    savedUsers.find((u) => String(u.email).toLowerCase() === cashierEmail) ??
    savedUsers.find((u) => String(u.email).toLowerCase() === 'cashier@demo.com') ??
    savedUsers[0]

  const customers = [
    {
      id: newId(),
      tenantId,
      name: 'Walk-in Guest',
      phone: '+254700000001',
      email: 'guest@example.com',
      loyaltyPoints: 12,
      totalSpend: 4500,
      createdAt: daysAgo(30),
      tags: ['vip'],
    },
    {
      id: newId(),
      tenantId,
      name: 'Jane Wanjiku',
      phone: '+254700000002',
      email: 'jane@example.com',
      loyaltyPoints: 40,
      totalSpend: 12800,
      createdAt: daysAgo(14),
      tags: [],
    },
    {
      id: newId(),
      tenantId,
      name: 'Peter Otieno',
      phone: '+254700000003',
      email: 'peter@example.com',
      loyaltyPoints: 5,
      totalSpend: 900,
      createdAt: daysAgo(3),
      tags: [],
    },
  ]
  setJSON(tenantId, 'customers', customers)

  let regId = getJSON(tenantId, 'activeRegisterId', null)
  let regs = getJSON(tenantId, 'registers', [])
  if (!Array.isArray(regs) || regs.length === 0) {
    regId = newId()
    regs = [
      {
        id: regId,
        tenantId,
        name: 'Register 1',
        openingFloat: 5000,
        currentFloat: 5000,
        status: 'open',
        cashierId: null,
      },
    ]
    setJSON(tenantId, 'registers', regs)
    setJSON(tenantId, 'activeRegisterId', regId)
  } else if (!regId) {
    regId = regs[0].id
    setJSON(tenantId, 'activeRegisterId', regId)
  }

  const p0 = products[0]
  const p1 = products[1]
  const sampleOrders = [2, 4, 6, 8, 10].map((days, idx) => {
    const qty = 2 + (idx % 2)
    const unitPrice = p0.price
    const subtotal = qty * unitPrice
    const taxRate = 16
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    return {
      id: newId(),
      tenantId,
      registerId: regId,
      cashierId: cashierRec?.id ?? null,
      customerId: customers[idx % customers.length].id,
      createdAt: daysAgo(days),
      status: 'completed',
      items: [
        {
          productId: p0.id,
          name: p0.name,
          qty,
          unitPrice,
          discount: 0,
          tax: taxAmount,
          total: subtotal,
        },
        ...(idx % 2 === 0
          ? [
              {
                productId: p1.id,
                name: p1.name,
                qty: 1,
                unitPrice: p1.price,
                discount: 0,
                tax: 0,
                total: p1.price,
              },
            ]
          : []),
      ],
      subtotal: subtotal + (idx % 2 === 0 ? p1.price : 0),
      taxAmount,
      discountAmount: 0,
      total: total + (idx % 2 === 0 ? p1.price : 0),
      payments: [{ method: 'cash', amount: total + (idx % 2 === 0 ? p1.price : 0) }],
      change: 0,
      receiptPrinted: true,
      notes: '',
    }
  })
  setJSON(tenantId, 'orders', sampleOrders)

  if (businessType === 'restaurant') {
    setJSON(tenantId, 'tableMap', {
      tables: [
        {
          id: 't1',
          x: 40,
          y: 40,
          label: '1',
          capacity: 4,
          status: 'free',
          orderId: null,
          currentTotal: 0,
          serverName: null,
        },
        {
          id: 't2',
          x: 200,
          y: 40,
          label: '2',
          capacity: 2,
          status: 'occupied',
          orderId: null,
          currentTotal: 1240,
          serverName: 'Demo Cashier',
        },
        {
          id: 't3',
          x: 360,
          y: 120,
          label: '3',
          capacity: 6,
          status: 'reserved',
          orderId: null,
          currentTotal: 0,
          serverName: null,
        },
      ],
    })
    setJSON(tenantId, 'kitchenQueue', [])
  }

  return { demoPassword: DEMO_PASSWORD }
}
