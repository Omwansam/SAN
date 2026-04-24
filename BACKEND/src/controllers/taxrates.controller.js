const { prisma } = require('../config/db');

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return NaN;
  return Number(n.toFixed(2));
}

const listTaxRates = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { active } = req.query || {};
    const where = { tenantId: req.tenant.id };
    if (active !== undefined) where.isActive = String(active).toLowerCase() === 'true';

    const taxRates = await db.taxRate.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
    return res.status(200).json({ success: true, count: taxRates.length, data: taxRates });
  } catch (error) {
    return next(error);
  }
};

const getTaxRateById = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const taxRate = await db.taxRate.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!taxRate) {
      return res.status(404).json({ success: false, error: 'Tax rate not found' });
    }
    return res.status(200).json({ success: true, data: taxRate });
  } catch (error) {
    return next(error);
  }
};

const createTaxRate = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, rate, description, isActive } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Tax rate name is required' });
    }
    const safeRate = normalizeRate(rate);
    if (!Number.isFinite(safeRate)) {
      return res.status(400).json({ success: false, error: 'rate must be a number between 0 and 100' });
    }

    const created = await db.taxRate.create({
      data: {
        tenantId: req.tenant.id,
        name: name.trim(),
        rate: safeRate,
        description: normalizeOptionalString(description) ?? null,
        isActive: isActive === undefined ? true : Boolean(isActive),
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A tax rate with this name already exists' });
    }
    return next(error);
  }
};

const updateTaxRate = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, rate, description, isActive } = req.body || {};
    const existing = await db.taxRate.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Tax rate not found' });
    }

    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'name must be a non-empty string' });
      }
      data.name = name.trim();
    }
    if (rate !== undefined) {
      const safeRate = normalizeRate(rate);
      if (!Number.isFinite(safeRate)) {
        return res.status(400).json({ success: false, error: 'rate must be a number between 0 and 100' });
      }
      data.rate = safeRate;
    }
    if (description !== undefined) data.description = normalizeOptionalString(description);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No tax rate fields to update' });
    }

    const updated = await db.taxRate.update({
      where: { id: existing.id },
      data,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A tax rate with this name already exists' });
    }
    return next(error);
  }
};

const deleteTaxRate = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const existing = await db.taxRate.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Tax rate not found' });
    }
    await db.taxRate.delete({ where: { id: existing.id } });
    return res.status(200).json({ success: true, message: 'Tax rate deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete tax rate in use by products. Reassign products first.',
      });
    }
    return next(error);
  }
};

module.exports = {
  listTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
};
