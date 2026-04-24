const { prisma } = require('../config/db');

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

const listStockLogs = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { branchId, productId, limit = 200 } = req.query || {};
    const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 200));

    const where = { tenantId: req.tenant.id };
    if (branchId) where.branchId = String(branchId);
    if (productId) where.productId = String(productId);

    const logs = await db.stockLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: safeLimit,
    });

    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return next(error);
  }
};

const createStockLog = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { branchId, productId, productName, delta, reason, userId } = req.body || {};

    const parsedDelta = Number(delta);
    if (!Number.isFinite(parsedDelta) || Math.trunc(parsedDelta) === 0) {
      return res.status(400).json({ success: false, error: 'delta must be a non-zero number' });
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'reason is required' });
    }

    const resolvedBranchId = normalizeOptionalString(branchId);
    if (resolvedBranchId) {
      const branch = await db.branch.findFirst({
        where: { id: resolvedBranchId, tenantId: req.tenant.id },
        select: { id: true },
      });
      if (!branch) {
        return res.status(400).json({ success: false, error: 'branchId is not in tenant scope' });
      }
    }

    const resolvedProductId = normalizeOptionalString(productId);
    let resolvedProductName = normalizeOptionalString(productName);
    if (resolvedProductId) {
      const product = await db.product.findFirst({
        where: { id: resolvedProductId, tenantId: req.tenant.id },
        select: { id: true, name: true },
      });
      if (!product) {
        return res.status(400).json({ success: false, error: 'productId is not in tenant scope' });
      }
      if (!resolvedProductName) resolvedProductName = product.name;
    }

    const resolvedUserId = normalizeOptionalString(userId) || req.user?.id || null;
    if (resolvedUserId) {
      const user = await db.user.findFirst({
        where: { id: resolvedUserId, tenantId: req.tenant.id },
        select: { id: true },
      });
      if (!user) {
        return res.status(400).json({ success: false, error: 'userId is not in tenant scope' });
      }
    }

    const log = await db.stockLog.create({
      data: {
        tenantId: req.tenant.id,
        branchId: resolvedBranchId,
        productId: resolvedProductId,
        productName: resolvedProductName,
        delta: Math.trunc(parsedDelta),
        reason: reason.trim(),
        userId: resolvedUserId,
      },
    });

    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listStockLogs,
  createStockLog,
};
