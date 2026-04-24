const { prisma } = require('../config/db');

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeOptionalEmail(value) {
  const s = normalizeOptionalString(value);
  if (s === undefined || s === null) return s;
  return s.toLowerCase();
}

const listSuppliers = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { q, active } = req.query || {};
    const where = { tenantId: req.tenant.id };
    if (active !== undefined) where.isActive = String(active).toLowerCase() === 'true';
    if (q && String(q).trim()) {
      const search = String(q).trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const suppliers = await db.supplier.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
    return res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    return next(error);
  }
};

const getSupplierById = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const supplier = await db.supplier.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    return res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    return next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, contactPerson, email, phoneNumber, address, taxId, isActive } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Supplier name is required' });
    }

    const created = await db.supplier.create({
      data: {
        tenantId: req.tenant.id,
        name: name.trim(),
        contactPerson: normalizeOptionalString(contactPerson) ?? null,
        email: normalizeOptionalEmail(email) ?? null,
        phoneNumber: normalizeOptionalString(phoneNumber) ?? null,
        address: normalizeOptionalString(address) ?? null,
        taxId: normalizeOptionalString(taxId) ?? null,
        isActive: isActive === undefined ? true : Boolean(isActive),
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Supplier email or phone is already in use in this workspace',
      });
    }
    return next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, contactPerson, email, phoneNumber, address, taxId, isActive } = req.body || {};
    const existing = await db.supplier.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'name must be a non-empty string' });
      }
      data.name = name.trim();
    }
    if (contactPerson !== undefined) data.contactPerson = normalizeOptionalString(contactPerson);
    if (email !== undefined) data.email = normalizeOptionalEmail(email);
    if (phoneNumber !== undefined) data.phoneNumber = normalizeOptionalString(phoneNumber);
    if (address !== undefined) data.address = normalizeOptionalString(address);
    if (taxId !== undefined) data.taxId = normalizeOptionalString(taxId);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No supplier fields to update' });
    }

    const updated = await db.supplier.update({
      where: { id: existing.id },
      data,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Supplier email or phone is already in use in this workspace',
      });
    }
    return next(error);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const existing = await db.supplier.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    await db.supplier.delete({ where: { id: existing.id } });
    return res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete supplier with purchase orders. Archive it instead.',
      });
    }
    return next(error);
  }
};

module.exports = {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
