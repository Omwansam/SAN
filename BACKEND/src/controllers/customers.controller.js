const { prisma } = require('../config/db');

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeNonNegativeInt(value, fieldName) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: `${fieldName} must be a non-negative number` };
  }
  return { ok: true, value: Math.trunc(n) };
}

const listCustomers = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { q } = req.query || {};
    const where = { tenantId: req.tenant.id };
    if (q && String(q).trim()) {
      const search = String(q).trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const customers = await db.customer.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
    return res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    return next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const customer = await db.customer.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    return res.status(200).json({ success: true, data: customer });
  } catch (error) {
    return next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, phone, email, loyaltyPoints, totalSpend, tags } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }
    const parsedPoints = normalizeNonNegativeInt(loyaltyPoints, 'loyaltyPoints');
    if (parsedPoints.ok === false) {
      return res.status(400).json({ success: false, error: parsedPoints.error });
    }
    const parsedSpend = normalizeNonNegativeInt(totalSpend, 'totalSpend');
    if (parsedSpend.ok === false) {
      return res.status(400).json({ success: false, error: parsedSpend.error });
    }

    const created = await db.customer.create({
      data: {
        tenantId: req.tenant.id,
        name: name.trim(),
        phone: normalizeOptionalString(phone) ?? null,
        email: normalizeOptionalString(email) ?? null,
        loyaltyPoints: parsedPoints.value ?? 0,
        totalSpend: parsedSpend.value ?? 0,
        tags: tags === undefined ? null : tags,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, phone, email, loyaltyPoints, totalSpend, tags } = req.body || {};

    const existing = await db.customer.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Customer name must be a non-empty string' });
      }
      data.name = name.trim();
    }
    if (phone !== undefined) data.phone = normalizeOptionalString(phone);
    if (email !== undefined) data.email = normalizeOptionalString(email);
    if (loyaltyPoints !== undefined) {
      const parsed = normalizeNonNegativeInt(loyaltyPoints, 'loyaltyPoints');
      if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
      data.loyaltyPoints = parsed.value;
    }
    if (totalSpend !== undefined) {
      const parsed = normalizeNonNegativeInt(totalSpend, 'totalSpend');
      if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
      data.totalSpend = parsed.value;
    }
    if (tags !== undefined) data.tags = tags;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No customer fields to update' });
    }

    const updated = await db.customer.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const existing = await db.customer.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    await db.customer.delete({ where: { id: existing.id } });
    return res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete customer with dependent records. Reassign or clear references first.',
      });
    }
    return next(error);
  }
};

module.exports = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
