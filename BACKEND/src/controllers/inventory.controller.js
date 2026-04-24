const { prisma } = require('../config/db');

function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

const listInventory = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { q, lowOnly = 'false', categoryId, includeInactive = 'false' } = req.query || {};

    const where = { tenantId: req.tenant.id };
    if (String(includeInactive).toLowerCase() !== 'true') where.active = true;
    if (categoryId) where.categoryId = String(categoryId);
    if (q && String(q).trim()) {
      const search = String(q).trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await db.product.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    });

    const data =
      String(lowOnly).toLowerCase() === 'true'
        ? products.filter((p) => (p.stock ?? 0) <= (p.lowStockAlert ?? 0))
        : products;

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return next(error);
  }
};

const adjustInventory = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { productId, delta, reason, branchId, lowStockAlert } = req.body || {};

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }
    const parsedDelta = normalizeNumber(delta, NaN);
    if (!Number.isFinite(parsedDelta) || Math.trunc(parsedDelta) === 0) {
      return res.status(400).json({ success: false, error: 'delta must be a non-zero number' });
    }
    const safeReason = String(reason || '').trim() || 'Manual adjustment';

    const resolvedLowAlert = normalizeNumber(lowStockAlert, null);
    if (resolvedLowAlert !== null && (!Number.isFinite(resolvedLowAlert) || resolvedLowAlert < 0)) {
      return res.status(400).json({ success: false, error: 'lowStockAlert must be a non-negative number' });
    }

    if (branchId) {
      const branch = await db.branch.findFirst({
        where: { id: String(branchId), tenantId: req.tenant.id },
        select: { id: true },
      });
      if (!branch) {
        return res.status(400).json({ success: false, error: 'branchId is not in tenant scope' });
      }
    }

    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId: req.tenant.id },
      });
      if (!product) {
        return { error: { code: 404, message: 'Product not found' } };
      }

      const nextStock = Math.max(0, (product.stock ?? 0) + Math.trunc(parsedDelta));
      const updateData = { stock: nextStock };
      if (resolvedLowAlert !== null) updateData.lowStockAlert = Math.trunc(resolvedLowAlert);

      const updated = await tx.product.update({
        where: { id: product.id },
        data: updateData,
      });

      const stockLog = await tx.stockLog.create({
        data: {
          tenantId: req.tenant.id,
          branchId: branchId ? String(branchId) : null,
          productId: product.id,
          productName: product.name,
          delta: Math.trunc(parsedDelta),
          reason: safeReason,
          userId: req.user?.id || null,
        },
      });

      return { updated, stockLog };
    });

    if (result.error) {
      return res.status(result.error.code).json({ success: false, error: result.error.message });
    }

    return res.status(200).json({
      success: true,
      data: {
        product: result.updated,
        stockLog: result.stockLog,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listInventory,
  adjustInventory,
};
