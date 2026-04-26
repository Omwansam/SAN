const { prisma } = require('../config/db');

const ALLOWED_DISCOUNT_TYPES = new Set(['none', 'percent', 'flat']);

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function toNumberOrNaN(value) {
  if (value === undefined || value === null || value === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

function parseDiscountType(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  return ALLOWED_DISCOUNT_TYPES.has(normalized) ? normalized : null;
}

function parseDateOrNull(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function validateDiscountValueByType(type, value) {
  if (!Number.isFinite(value) || value < 0) {
    return 'value must be a non-negative number';
  }
  if (type === 'percent' && value > 100) {
    return 'percent discount cannot exceed 100';
  }
  return null;
}

function safePrismaDecimal(numberValue) {
  return Number(numberValue.toFixed(2));
}

function resolveDiscountBaseAmount(payload = {}) {
  const subtotal = toNumberOrNaN(payload.subtotal);
  const total = toNumberOrNaN(payload.total);
  if (Number.isFinite(subtotal) && subtotal >= 0) return subtotal;
  if (Number.isFinite(total) && total >= 0) return total;
  return NaN;
}

function computeDiscountAmount(discountType, discountValue, baseAmount) {
  if (discountType === 'none') return 0;
  if (discountType === 'percent') {
    return Math.min(baseAmount, (baseAmount * discountValue) / 100);
  }
  // flat
  return Math.min(baseAmount, discountValue);
}

const listDiscounts = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const {
      q,
      active,
      type,
      includeExpired = 'false',
      includeFuture = 'true',
      minValue,
      maxValue,
      limit = 200,
    } = req.query || {};

    const where = { tenantId: req.tenant.id };
    const parsedActive = parseBoolean(active);
    if (active !== undefined && parsedActive === null) {
      return res.status(400).json({ success: false, error: 'active must be true or false' });
    }
    if (parsedActive !== undefined) where.isActive = parsedActive;

    const parsedType = parseDiscountType(type);
    if (type !== undefined && parsedType === null) {
      return res.status(400).json({ success: false, error: 'type must be one of none|percent|flat' });
    }
    if (parsedType !== undefined) where.type = parsedType;

    if (q && String(q).trim()) {
      const search = String(q).trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const minValueNum = toNumberOrNaN(minValue);
    const maxValueNum = toNumberOrNaN(maxValue);
    if (minValue !== undefined && !Number.isFinite(minValueNum)) {
      return res.status(400).json({ success: false, error: 'minValue must be numeric' });
    }
    if (maxValue !== undefined && !Number.isFinite(maxValueNum)) {
      return res.status(400).json({ success: false, error: 'maxValue must be numeric' });
    }
    if (Number.isFinite(minValueNum) || Number.isFinite(maxValueNum)) {
      where.value = {};
      if (Number.isFinite(minValueNum)) where.value.gte = safePrismaDecimal(minValueNum);
      if (Number.isFinite(maxValueNum)) where.value.lte = safePrismaDecimal(maxValueNum);
    }

    const now = new Date();
    const parsedIncludeExpired = parseBoolean(includeExpired);
    const parsedIncludeFuture = parseBoolean(includeFuture);
    if (parsedIncludeExpired === null) {
      return res.status(400).json({ success: false, error: 'includeExpired must be true or false' });
    }
    if (parsedIncludeFuture === null) {
      return res.status(400).json({ success: false, error: 'includeFuture must be true or false' });
    }
    if (parsedIncludeExpired === false) {
      where.OR = [...(where.OR || []), { endDate: null }, { endDate: { gte: now } }];
    }
    if (parsedIncludeFuture === false) {
      where.AND = [...(where.AND || []), { OR: [{ startDate: null }, { startDate: { lte: now } }] }];
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const discounts = await db.discount.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: parsedLimit,
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts,
    });
  } catch (error) {
    return next(error);
  }
};

const getDiscountById = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const discount = await db.discount.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
    if (!discount) {
      return res.status(404).json({ success: false, error: 'Discount not found' });
    }
    return res.status(200).json({ success: true, data: discount });
  } catch (error) {
    return next(error);
  }
};

const createDiscount = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const {
      name,
      code,
      type = 'flat',
      value,
      startDate,
      endDate,
      isActive = true,
      minOrderValue,
    } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Discount name is required' });
    }

    const parsedType = parseDiscountType(type);
    if (!parsedType) {
      return res.status(400).json({ success: false, error: 'type must be one of none|percent|flat' });
    }

    const numericValue = toNumberOrNaN(value);
    const valueError = validateDiscountValueByType(parsedType, numericValue);
    if (valueError) {
      return res.status(400).json({ success: false, error: valueError });
    }

    const startAt = parseDateOrNull(startDate);
    if (startDate !== undefined && startAt === null) {
      return res.status(400).json({ success: false, error: 'startDate must be a valid date' });
    }
    const endAt = parseDateOrNull(endDate);
    if (endDate !== undefined && endAt === null) {
      return res.status(400).json({ success: false, error: 'endDate must be a valid date' });
    }
    if (startAt && endAt && startAt > endAt) {
      return res.status(400).json({ success: false, error: 'startDate cannot be after endDate' });
    }

    const minOrderNumeric = toNumberOrNaN(minOrderValue);
    if (minOrderValue !== undefined && (!Number.isFinite(minOrderNumeric) || minOrderNumeric < 0)) {
      return res.status(400).json({ success: false, error: 'minOrderValue must be a non-negative number' });
    }

    const activeBool = parseBoolean(isActive);
    if (activeBool === null) {
      return res.status(400).json({ success: false, error: 'isActive must be true or false' });
    }

    const created = await db.discount.create({
      data: {
        tenantId: req.tenant.id,
        name: name.trim(),
        code: normalizeOptionalString(code),
        type: parsedType,
        value: safePrismaDecimal(numericValue),
        startDate: startAt ?? null,
        endDate: endAt ?? null,
        isActive: activeBool ?? true,
        minOrderValue: Number.isFinite(minOrderNumeric)
          ? safePrismaDecimal(minOrderNumeric)
          : null,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A discount with this code already exists in this workspace',
      });
    }
    return next(error);
  }
};

const updateDiscount = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const existing = await db.discount.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: {
        id: true,
        type: true,
      },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Discount not found' });
    }

    const {
      name,
      code,
      type,
      value,
      startDate,
      endDate,
      isActive,
      minOrderValue,
    } = req.body || {};

    const data = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'name must be a non-empty string' });
      }
      data.name = name.trim();
    }
    if (code !== undefined) data.code = normalizeOptionalString(code);

    let effectiveType = existing.type;
    if (type !== undefined) {
      const parsedType = parseDiscountType(type);
      if (!parsedType) {
        return res.status(400).json({ success: false, error: 'type must be one of none|percent|flat' });
      }
      data.type = parsedType;
      effectiveType = parsedType;
    }

    if (value !== undefined) {
      const numericValue = toNumberOrNaN(value);
      const valueError = validateDiscountValueByType(effectiveType, numericValue);
      if (valueError) {
        return res.status(400).json({ success: false, error: valueError });
      }
      data.value = safePrismaDecimal(numericValue);
    }

    if (startDate !== undefined) {
      const parsed = parseDateOrNull(startDate);
      if (parsed === null && startDate !== null && startDate !== '') {
        return res.status(400).json({ success: false, error: 'startDate must be a valid date' });
      }
      data.startDate = parsed;
    }
    if (endDate !== undefined) {
      const parsed = parseDateOrNull(endDate);
      if (parsed === null && endDate !== null && endDate !== '') {
        return res.status(400).json({ success: false, error: 'endDate must be a valid date' });
      }
      data.endDate = parsed;
    }
    if (
      (data.startDate !== undefined || data.endDate !== undefined) &&
      (data.startDate ?? null) &&
      (data.endDate ?? null) &&
      data.startDate > data.endDate
    ) {
      return res.status(400).json({ success: false, error: 'startDate cannot be after endDate' });
    }

    if (isActive !== undefined) {
      const activeBool = parseBoolean(isActive);
      if (activeBool === null) {
        return res.status(400).json({ success: false, error: 'isActive must be true or false' });
      }
      data.isActive = activeBool;
    }

    if (minOrderValue !== undefined) {
      if (minOrderValue === null || minOrderValue === '') {
        data.minOrderValue = null;
      } else {
        const minOrderNumeric = toNumberOrNaN(minOrderValue);
        if (!Number.isFinite(minOrderNumeric) || minOrderNumeric < 0) {
          return res.status(400).json({ success: false, error: 'minOrderValue must be a non-negative number' });
        }
        data.minOrderValue = safePrismaDecimal(minOrderNumeric);
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No discount fields to update' });
    }

    const updated = await db.discount.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A discount with this code already exists in this workspace',
      });
    }
    return next(error);
  }
};

const deleteDiscount = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const existing = await db.discount.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Discount not found' });
    }

    await db.discount.delete({ where: { id: existing.id } });
    return res.status(200).json({ success: true, message: 'Discount deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete discount in use by orders. Disable it instead.',
      });
    }
    return next(error);
  }
};

const validateDiscountEligibility = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const {
      discountId,
      code,
      subtotal,
      total,
      now: nowInput,
      requireActive = true,
    } = req.body || {};

    if (!discountId && !code) {
      return res
        .status(400)
        .json({ success: false, error: 'discountId or code is required' });
    }

    const baseAmount = resolveDiscountBaseAmount({ subtotal, total });
    if (!Number.isFinite(baseAmount) || baseAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'subtotal or total must be provided as a non-negative number',
      });
    }

    const checkActive = parseBoolean(requireActive);
    if (checkActive === null) {
      return res
        .status(400)
        .json({ success: false, error: 'requireActive must be true or false' });
    }

    const lookupWhere = { tenantId: req.tenant.id };
    if (discountId) lookupWhere.id = String(discountId);
    else lookupWhere.code = String(code).trim();

    const discount = await db.discount.findFirst({
      where: lookupWhere,
    });

    if (!discount) {
      return res
        .status(404)
        .json({ success: false, error: 'Discount not found in this workspace' });
    }

    const now = nowInput ? new Date(String(nowInput)) : new Date();
    if (nowInput && Number.isNaN(now.getTime())) {
      return res.status(400).json({ success: false, error: 'now must be a valid datetime' });
    }

    const reasons = [];
    if (checkActive !== false && !discount.isActive) {
      reasons.push('Discount is inactive');
    }
    if (discount.startDate && now < discount.startDate) {
      reasons.push('Discount is not active yet');
    }
    if (discount.endDate && now > discount.endDate) {
      reasons.push('Discount has expired');
    }

    const minOrderValue = discount.minOrderValue ? Number(discount.minOrderValue) : 0;
    if (Number.isFinite(minOrderValue) && baseAmount < minOrderValue) {
      reasons.push(`Order does not meet minimum value of ${minOrderValue.toFixed(2)}`);
    }

    const discountValue = Number(discount.value || 0);
    const rawDiscount = computeDiscountAmount(discount.type, discountValue, baseAmount);
    const discountAmount = Number(rawDiscount.toFixed(2));
    const finalTotal = Number(Math.max(0, baseAmount - discountAmount).toFixed(2));

    return res.status(200).json({
      success: true,
      data: {
        eligible: reasons.length === 0,
        reasons,
        discount: {
          id: discount.id,
          name: discount.name,
          code: discount.code,
          type: discount.type,
          value: discountValue,
          minOrderValue: Number.isFinite(minOrderValue) ? minOrderValue : null,
          startDate: discount.startDate,
          endDate: discount.endDate,
          isActive: discount.isActive,
        },
        input: {
          subtotal: Number.isFinite(Number(subtotal)) ? Number(subtotal) : null,
          total: Number.isFinite(Number(total)) ? Number(total) : null,
          baseAmount: Number(baseAmount.toFixed(2)),
          evaluatedAt: now,
        },
        calculation: {
          discountAmount,
          finalTotal,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscountEligibility,
};

