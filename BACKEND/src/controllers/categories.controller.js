const { prisma } = require('../config/db');

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}

const listCategories = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const categories = await db.category.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    return next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const category = await db.category.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, color = null, icon = 'tag', sortOrder } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    if (color !== null && color !== undefined && !isHexColor(String(color))) {
      return res.status(400).json({ success: false, error: 'Category color must be a valid hex code like #6366f1' });
    }
    if (sortOrder !== undefined && !Number.isFinite(Number(sortOrder))) {
      return res.status(400).json({ success: false, error: 'sortOrder must be a number' });
    }

    const created = await db.category.create({
      data: {
        tenantId: req.tenant.id,
        name: name.trim(),
        color: normalizeOptionalString(color) ?? null,
        icon: normalizeOptionalString(icon) ?? 'tag',
        sortOrder: sortOrder === undefined ? 0 : Math.trunc(Number(sortOrder)),
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A category with this name already exists in this workspace',
      });
    }
    return next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, color, icon, sortOrder } = req.body || {};

    if (name === undefined && color === undefined && icon === undefined && sortOrder === undefined) {
      return res.status(400).json({ success: false, error: 'No category fields to update' });
    }

    const current = await db.category.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Category name must be a non-empty string' });
      }
      data.name = name.trim();
    }
    if (color !== undefined) {
      if (color !== null && color !== '' && !isHexColor(String(color))) {
        return res.status(400).json({ success: false, error: 'Category color must be a valid hex code like #6366f1' });
      }
      data.color = normalizeOptionalString(color);
    }
    if (icon !== undefined) data.icon = normalizeOptionalString(icon);
    if (sortOrder !== undefined) {
      if (!Number.isFinite(Number(sortOrder))) {
        return res.status(400).json({ success: false, error: 'sortOrder must be a number' });
      }
      data.sortOrder = Math.trunc(Number(sortOrder));
    }

    const updated = await db.category.update({
      where: { id: current.id },
      data,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A category with this name already exists in this workspace',
      });
    }
    return next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const current = await db.category.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    await db.category.delete({ where: { id: current.id } });
    return res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete category with dependent records. Reassign products first.',
      });
    }
    return next(error);
  }
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
