const { prisma } = require('../config/db');

function normalizeMoney(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Number(n.toFixed(2));
}

const listShifts = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { status, branchId, userId } = req.query || {};
    const where = { tenantId: req.tenant.id };
    if (status) where.status = String(status);
    if (branchId) where.branchId = String(branchId);
    if (userId) where.userId = String(userId);

    const shifts = await db.shift.findMany({
      where,
      orderBy: [{ openingTime: 'desc' }],
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.status(200).json({ success: true, count: shifts.length, data: shifts });
  } catch (error) {
    return next(error);
  }
};

const getActiveShift = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { branchId, userId } = req.query || {};
    const where = { tenantId: req.tenant.id, status: 'open' };
    if (branchId) where.branchId = String(branchId);
    if (userId) where.userId = String(userId);
    const shift = await db.shift.findFirst({
      where,
      orderBy: { openingTime: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.status(200).json({ success: true, data: shift || null });
  } catch (error) {
    return next(error);
  }
};

const createShift = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { branchId, userId, openingBalance = 0, notes } = req.body || {};
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'branchId is required' });
    }
    const resolvedUserId = userId || req.user.id;
    const safeOpening = normalizeMoney(openingBalance, 0);
    if (!Number.isFinite(safeOpening)) {
      return res.status(400).json({ success: false, error: 'openingBalance must be a non-negative number' });
    }

    const [branch, user] = await Promise.all([
      db.branch.findFirst({
        where: { id: String(branchId), tenantId: req.tenant.id },
        select: { id: true },
      }),
      db.user.findFirst({
        where: { id: String(resolvedUserId), tenantId: req.tenant.id },
        select: { id: true },
      }),
    ]);
    if (!branch) {
      return res.status(400).json({ success: false, error: 'branchId is not in tenant scope' });
    }
    if (!user) {
      return res.status(400).json({ success: false, error: 'userId is not in tenant scope' });
    }

    const alreadyOpen = await db.shift.findFirst({
      where: {
        tenantId: req.tenant.id,
        branchId: String(branchId),
        userId: String(resolvedUserId),
        status: 'open',
      },
      select: { id: true },
    });
    if (alreadyOpen) {
      return res.status(409).json({
        success: false,
        error: 'This user already has an open shift in the selected branch',
      });
    }

    const created = await db.shift.create({
      data: {
        tenantId: req.tenant.id,
        branchId: String(branchId),
        userId: String(resolvedUserId),
        openingBalance: safeOpening,
        notes: notes ? String(notes).trim() : null,
        status: 'open',
      },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return next(error);
  }
};

const closeShift = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { id } = req.params;
    const { closingBalance, expectedBalance, notes } = req.body || {};

    const shift = await db.shift.findFirst({
      where: { id, tenantId: req.tenant.id },
      select: { id: true, status: true },
    });
    if (!shift) {
      return res.status(404).json({ success: false, error: 'Shift not found' });
    }
    if (shift.status !== 'open') {
      return res.status(400).json({ success: false, error: 'Shift is already closed' });
    }

    const safeClosing = normalizeMoney(closingBalance, null);
    if (safeClosing !== null && !Number.isFinite(safeClosing)) {
      return res.status(400).json({ success: false, error: 'closingBalance must be a non-negative number' });
    }
    const safeExpected = normalizeMoney(expectedBalance, null);
    if (safeExpected !== null && !Number.isFinite(safeExpected)) {
      return res.status(400).json({ success: false, error: 'expectedBalance must be a non-negative number' });
    }

    const updated = await db.shift.update({
      where: { id: shift.id },
      data: {
        status: 'closed',
        closingTime: new Date(),
        closingBalance: safeClosing,
        expectedBalance: safeExpected,
        notes: notes === undefined ? undefined : (notes ? String(notes).trim() : null),
      },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listShifts,
  getActiveShift,
  createShift,
  closeShift,
};
