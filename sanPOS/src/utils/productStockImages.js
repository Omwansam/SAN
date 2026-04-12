/**
 * Curated Unsplash URLs (auto=format, fixed crop) for demo catalog thumbnails.
 * Licensed for use via Unsplash License — hotlinking OK for demos.
 */
const Q = 'auto=format&w=480&h=360&fit=crop&q=80'

const RESTAURANT = [
  `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?${Q}`,
  `https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?${Q}`,
  `https://images.unsplash.com/photo-1467003909585-2f8a72700288?${Q}`,
  `https://images.unsplash.com/photo-1585936411314-b032546370f9?${Q}`,
  `https://images.unsplash.com/photo-1509440159596-0249088772ff?${Q}`,
  `https://images.unsplash.com/photo-1567621630773-c5ec602e2c6b?${Q}`,
  `https://images.unsplash.com/photo-1516684732162-798a0062be99?${Q}`,
  `https://images.unsplash.com/photo-1512621776951-a57141f2eefd?${Q}`,
  `https://images.unsplash.com/photo-1600271886742-f049cd451bba?${Q}`,
  `https://images.unsplash.com/photo-1554866586-ce58832848b3?${Q}`,
  `https://images.unsplash.com/photo-1548839140-29a749e1cf4d?${Q}`,
  `https://images.unsplash.com/photo-1564890369478-c5b2e0045bcd?${Q}`,
]

const PHARMACY = [
  `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?${Q}`,
  `https://images.unsplash.com/photo-1471864190281-a93a3070b6de?${Q}`,
  `https://images.unsplash.com/photo-1587854692152-cbe660dbde88?${Q}`,
  `https://images.unsplash.com/photo-1550572017-edd951aa8f72?${Q}`,
  `https://images.unsplash.com/photo-1631549916766-7429c495676d?${Q}`,
  `https://images.unsplash.com/photo-1559757148-5c350d0d3c56?${Q}`,
  `https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?${Q}`,
  `https://images.unsplash.com/photo-1626285861690-475f4f48cd3d?${Q}`,
  `https://images.unsplash.com/photo-1579684385127-1ef15d508118?${Q}`,
  `https://images.unsplash.com/photo-1576091160399-112ba8d181d5?${Q}`,
  `https://images.unsplash.com/photo-1555633514-abcee6ab35e1?${Q}`,
  `https://images.unsplash.com/photo-1585435555313-f466782ca674?${Q}`,
]

const SALON = [
  `https://images.unsplash.com/photo-1560066984-138d9534a000?${Q}`,
  `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?${Q}`,
  `https://images.unsplash.com/photo-1595476108010-b4d1f7b4a78d?${Q}`,
  `https://images.unsplash.com/photo-1503951914875-452162b0f3f1?${Q}`,
  `https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?${Q}`,
  `https://images.unsplash.com/photo-1604654894610-df63bc536371?${Q}`,
  `https://images.unsplash.com/photo-1519415943484-9fa1873496d4?${Q}`,
  `https://images.unsplash.com/photo-1522338242992-e1a54906a8da?${Q}`,
  `https://images.unsplash.com/photo-1519699047748-de8e457a634e?${Q}`,
  `https://images.unsplash.com/photo-1604654894610-df63bc536371?${Q}`,
  `https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?${Q}`,
  `https://images.unsplash.com/photo-1560066984-138d9534a000?${Q}`,
]

const RETAIL = [
  `https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?${Q}`,
  `https://images.unsplash.com/photo-1542291026-7eec264c27b1?${Q}`,
  `https://images.unsplash.com/photo-1556821840-3a63f95609a7?${Q}`,
  `https://images.unsplash.com/photo-1434389678769-8aa60cf101d1?${Q}`,
  `https://images.unsplash.com/photo-1583394838336-acd978a1c406?${Q}`,
  `https://images.unsplash.com/photo-1625948515291-69613efd103f?${Q}`,
  `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?${Q}`,
  `https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?${Q}`,
  `https://images.unsplash.com/photo-1586201375761-83865001e31c?${Q}`,
  `https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?${Q}`,
  `https://images.unsplash.com/photo-1587049352846-4a222e2d0124?${Q}`,
  `https://images.unsplash.com/photo-1556911220-e15b29be8c8f?${Q}`,
]

const POOLS = {
  restaurant: RESTAURANT,
  pharmacy: PHARMACY,
  salon: SALON,
  retail: RETAIL,
  grocery: RETAIL,
  custom: RETAIL,
}

/**
 * @param {string} businessType
 * @param {number} index product index in seed list
 */
export function stockImageUrlForSeed(businessType, index) {
  const pool = POOLS[businessType] ?? RETAIL
  return pool[Math.abs(index) % pool.length]
}
