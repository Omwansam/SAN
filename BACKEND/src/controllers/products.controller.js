const { prisma } = require('../config/db');

function normalizeInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.trunc(parsed);
}

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function parseOptionalBoolean(value, fieldName) {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value === 'boolean') return { ok: true, value };
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return { ok: true, value: true };
    if (normalized === 'false') return { ok: true, value: false };
  }
  return { ok: false, error: `${fieldName} must be true or false` };
}

const listProducts = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { categoryId, q, active } = req.query || {};

    const where = { tenantId: req.tenant.id };
    if (categoryId) where.categoryId = String(categoryId);
    if (q && String(q).trim()) {
      const search = String(q).trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (active !== undefined) {
      const parsedActive = parseOptionalBoolean(active, 'active');
      if (!parsedActive.ok || parsedActive.value === undefined) {
        return res.status(400).json({ success: false, error: parsedActive.error || 'active must be true or false' });
      }
      where.active = parsedActive.value;
    }

    const products = await db.product.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true, sortOrder: true },
        },
      },
    });

    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    return next(error);
  }
};

const getProductByBarcode = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const barcode = String(req.params?.barcode || '').trim();
    if (!barcode) {
      return res.status(400).json({ success: false, error: 'Barcode is required' });
    }

    const product = await db.product.findFirst({
      where: {
        tenantId: req.tenant.id,
        barcode,
        active: true,
      },
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true, sortOrder: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found for this barcode' });
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const product = await db.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true, sortOrder: true },
        },
      },
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    return next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const {
      name,
      description,
      sku,
      barcode,
      categoryId,
      taxRateId,
      price,
      costPrice,
      taxable,
      imageUrl,
      stock,
      lowStockAlert,
      unit,
      variants,
      active,
      controlled,
      kitchenStationId,
    } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    const normalizedPrice = normalizeInteger(price, 0);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return res.status(400).json({ success: false, error: 'Price must be a non-negative number' });
    }
    const normalizedCostPrice = costPrice === undefined || costPrice === null || costPrice === ''
      ? null
      : normalizeInteger(costPrice, 0);
    if (normalizedCostPrice !== null && (!Number.isFinite(normalizedCostPrice) || normalizedCostPrice < 0)) {
      return res.status(400).json({ success: false, error: 'Cost price must be a non-negative number' });
    }
    const normalizedStock = normalizeInteger(stock, 0);
    if (!Number.isFinite(normalizedStock)) {
      return res.status(400).json({ success: false, error: 'Stock must be a number' });
    }
    const normalizedLowStock = normalizeInteger(lowStockAlert, 0);
    if (!Number.isFinite(normalizedLowStock) || normalizedLowStock < 0) {
      return res.status(400).json({ success: false, error: 'Low stock alert must be a non-negative number' });
    }

    const parsedTaxable = parseOptionalBoolean(taxable, 'taxable');
    if (!parsedTaxable.ok) {
      return res.status(400).json({ success: false, error: parsedTaxable.error });
    }
    const parsedActive = parseOptionalBoolean(active, 'active');
    if (!parsedActive.ok) {
      return res.status(400).json({ success: false, error: parsedActive.error });
    }
    const parsedControlled = parseOptionalBoolean(controlled, 'controlled');
    if (!parsedControlled.ok) {
      return res.status(400).json({ success: false, error: parsedControlled.error });
    }

    const resolvedCategoryId = categoryId ? String(categoryId).trim() : null;
    if (resolvedCategoryId) {
      const category = await db.category.findFirst({
        where: { id: resolvedCategoryId, tenantId: req.tenant.id },
        select: { id: true },
      });
      if (!category) {
        return res.status(400).json({ success: false, error: 'Category does not exist in this workspace' });
      }
    }
    const resolvedTaxRateId = taxRateId ? String(taxRateId).trim() : null;
    if (resolvedTaxRateId) {
      const taxRate = await db.taxRate.findFirst({
        where: { id: resolvedTaxRateId, tenantId: req.tenant.id, isActive: true },
        select: { id: true },
      });
      if (!taxRate) {
        return res.status(400).json({ success: false, error: 'Tax rate does not exist in this workspace' });
      }
    }

    const created = await db.product.create({
      data: {
        tenantId: req.tenant.id,
        categoryId: resolvedCategoryId,
        taxRateId: resolvedTaxRateId,
        name: name.trim(),
        description: normalizeOptionalString(description) ?? null,
        sku: normalizeOptionalString(sku) ?? null,
        barcode: normalizeOptionalString(barcode) ?? null,
        price: normalizedPrice,
        costPrice: normalizedCostPrice,
        taxable: parsedTaxable.value === undefined ? true : parsedTaxable.value,
        imageUrl: normalizeOptionalString(imageUrl) ?? null,
        stock: normalizedStock,
        lowStockAlert: normalizedLowStock,
        unit: normalizeOptionalString(unit) || 'ea',
        variants: variants ?? null,
        active: parsedActive.value === undefined ? true : parsedActive.value,
        controlled: parsedControlled.value === undefined ? false : parsedControlled.value,
        kitchenStationId: normalizeOptionalString(kitchenStationId) ?? null,
      },
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true, sortOrder: true },
        },
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'SKU or barcode already exists in this workspace',
      });
    }
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const {
      name,
      description,
      sku,
      barcode,
      categoryId,
      taxRateId,
      price,
      costPrice,
      taxable,
      imageUrl,
      stock,
      lowStockAlert,
      unit,
      variants,
      active,
      controlled,
      kitchenStationId,
    } = req.body || {};

    const current = await db.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Product name must be a non-empty string' });
      }
      data.name = name.trim();
    }
    if (description !== undefined) data.description = normalizeOptionalString(description);
    if (sku !== undefined) data.sku = normalizeOptionalString(sku);
    if (barcode !== undefined) data.barcode = normalizeOptionalString(barcode);
    if (categoryId !== undefined) {
      if (!categoryId) {
        data.categoryId = null;
      } else {
        const resolvedCategoryId = String(categoryId);
        const category = await db.category.findFirst({
          where: { id: resolvedCategoryId, tenantId: req.tenant.id },
          select: { id: true },
        });
        if (!category) {
          return res.status(400).json({ success: false, error: 'Category does not exist in this workspace' });
        }
        data.categoryId = resolvedCategoryId;
      }
    }
    if (taxRateId !== undefined) {
      if (!taxRateId) {
        data.taxRateId = null;
      } else {
        const resolvedTaxRateId = String(taxRateId).trim();
        const taxRate = await db.taxRate.findFirst({
          where: { id: resolvedTaxRateId, tenantId: req.tenant.id, isActive: true },
          select: { id: true },
        });
        if (!taxRate) {
          return res.status(400).json({ success: false, error: 'Tax rate does not exist in this workspace' });
        }
        data.taxRateId = resolvedTaxRateId;
      }
    }
    if (price !== undefined) {
      const normalized = normalizeInteger(price, 0);
      if (!Number.isFinite(normalized) || normalized < 0) {
        return res.status(400).json({ success: false, error: 'Price must be a non-negative number' });
      }
      data.price = normalized;
    }
    if (costPrice !== undefined) {
      if (costPrice === null || costPrice === '') {
        data.costPrice = null;
      } else {
        const normalized = normalizeInteger(costPrice, 0);
        if (!Number.isFinite(normalized) || normalized < 0) {
          return res.status(400).json({ success: false, error: 'Cost price must be a non-negative number' });
        }
        data.costPrice = normalized;
      }
    }
    if (taxable !== undefined) {
      const parsed = parseOptionalBoolean(taxable, 'taxable');
      if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
      data.taxable = parsed.value;
    }
    if (imageUrl !== undefined) data.imageUrl = normalizeOptionalString(imageUrl);
    if (stock !== undefined) {
      const normalized = normalizeInteger(stock, 0);
      if (!Number.isFinite(normalized)) {
        return res.status(400).json({ success: false, error: 'Stock must be a number' });
      }
      data.stock = normalized;
    }
    if (lowStockAlert !== undefined) {
      const normalized = normalizeInteger(lowStockAlert, 0);
      if (!Number.isFinite(normalized) || normalized < 0) {
        return res.status(400).json({ success: false, error: 'Low stock alert must be a non-negative number' });
      }
      data.lowStockAlert = normalized;
    }
    if (unit !== undefined) data.unit = normalizeOptionalString(unit) || 'ea';
    if (variants !== undefined) data.variants = variants ?? null;
    if (active !== undefined) {
      const parsed = parseOptionalBoolean(active, 'active');
      if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
      data.active = parsed.value;
    }
    if (controlled !== undefined) {
      const parsed = parseOptionalBoolean(controlled, 'controlled');
      if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
      data.controlled = parsed.value;
    }
    if (kitchenStationId !== undefined) data.kitchenStationId = normalizeOptionalString(kitchenStationId);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No product fields to update' });
    }

    const updated = await db.product.update({
      where: { id: current.id },
      data,
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true, sortOrder: true },
        },
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'SKU or barcode already exists in this workspace',
      });
    }
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const current = await db.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await db.product.delete({ where: { id: current.id } });
    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete product with dependent records. Archive it instead.',
      });
    }
    return next(error);
  }
};

module.exports = {
  getProducts: listProducts,
  listProducts,
  getProductByBarcode,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
