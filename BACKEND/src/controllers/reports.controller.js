const { prisma } = require('../config/db');

function parseDate(raw, fallback) {
  if (!raw) return fallback;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

const getReportSummary = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const now = new Date();
    const from = parseDate(req.query?.from, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const to = parseDate(req.query?.to, now);
    const where = {
      tenantId: req.tenant.id,
      createdAt: { gte: from, lte: to },
    };
    if (req.query?.branchId) where.branchId = String(req.query.branchId);

    const [ordersCount, orderAgg, stockLogsCount, customersCount] = await Promise.all([
      db.order.count({ where }),
      db.order.aggregate({
        where,
        _sum: {
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          total: true,
          tipsTotal: true,
          deliveryFeeAmount: true,
        },
      }),
      db.stockLog.count({
        where: {
          tenantId: req.tenant.id,
          createdAt: { gte: from, lte: to },
          ...(req.query?.branchId ? { branchId: String(req.query.branchId) } : {}),
        },
      }),
      db.customer.count({ where: { tenantId: req.tenant.id } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        from,
        to,
        ordersCount,
        customersCount,
        stockMovements: stockLogsCount,
        sums: {
          subtotal: orderAgg._sum.subtotal || 0,
          taxAmount: orderAgg._sum.taxAmount || 0,
          discountAmount: orderAgg._sum.discountAmount || 0,
          total: orderAgg._sum.total || 0,
          tipsTotal: orderAgg._sum.tipsTotal || 0,
          deliveryFeeAmount: orderAgg._sum.deliveryFeeAmount || 0,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getSalesReport = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const now = new Date();
    const from = parseDate(req.query?.from, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const to = parseDate(req.query?.to, now);
    const where = {
      tenantId: req.tenant.id,
      createdAt: { gte: from, lte: to },
    };
    if (req.query?.branchId) where.branchId = String(req.query.branchId);
    if (req.query?.cashierId) where.cashierId = String(req.query.cashierId);

    const sales = await db.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        branch: { select: { id: true, name: true } },
        cashier: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            qty: true,
            unitPrice: true,
            discount: true,
            tax: true,
            total: true,
          },
        },
        payments: {
          select: { id: true, method: true, amount: true, reference: true, createdAt: true },
        },
      },
    });

    return res.status(200).json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    return next(error);
  }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const where = { tenantId: req.tenant.id };
    if (req.query?.branchId) where.branchId = String(req.query.branchId);
    if (req.query?.categoryId) where.categoryId = String(req.query.categoryId);
    if (req.query?.active !== undefined) where.active = String(req.query.active).toLowerCase() === 'true';

    const products = await db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ name: 'asc' }],
    });

    const data = products.map((p) => ({
      ...p,
      lowStock: (p.stock ?? 0) <= (p.lowStockAlert ?? 0),
    }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getReportSummary,
  getSalesReport,
  getInventoryReport,
};
