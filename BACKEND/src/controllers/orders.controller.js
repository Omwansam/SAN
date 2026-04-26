const { prisma } = require('../config/db');
const {
  enqueueInvoiceForOrder,
  enqueueCreditNoteForOrder,
} = require('../services/etims.service');

function toInt(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.trunc(parsed);
}

function normalizeString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function parseOrderStatus(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (['completed', 'refunded', 'cancelled'].includes(normalized)) {
    return normalized;
  }
  return null;
}

const PURCHASE_ORDER_STATUS = new Set(['pending', 'approved', 'received', 'cancelled']);

function parsePurchaseOrderStatus(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return PURCHASE_ORDER_STATUS.has(normalized) ? normalized : null;
}

function parseDiscountType(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return ['none', 'percent', 'flat'].includes(normalized) ? normalized : null;
}

function resolveDiscountAmount(discountType, discountValue, baseAmount) {
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) return 0;
  if (discountType === 'percent') {
    return Math.min(baseAmount, Math.max(0, (baseAmount * discountValue) / 100));
  }
  if (discountType === 'flat') {
    return Math.min(baseAmount, Math.max(0, discountValue));
  }
  return 0;
}

function validateCreateOrderPayload(req, res, next) {
  const { items = [], payment = null } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Order must include at least one item' });
  }
  if (payment !== null && typeof payment !== 'object') {
    return res.status(400).json({ success: false, error: 'payment must be an object when provided' });
  }
  return next();
}

function validateOrderFilters(req, res, next) {
  const { status, from, to, limit } = req.query || {};
  if (status && !parseOrderStatus(status)) {
    return res.status(400).json({ success: false, error: 'Invalid order status filter' });
  }
  if (from) {
    const fromDate = new Date(String(from));
    if (Number.isNaN(fromDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid from date' });
    }
  }
  if (to) {
    const toDate = new Date(String(to));
    if (Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid to date' });
    }
  }
  if (limit !== undefined) {
    const parsedLimit = toInt(limit, 100);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ success: false, error: 'limit must be a positive number' });
    }
  }
  return next();
}

function validateCreatePurchaseOrderPayload(req, res, next) {
  const { supplierId, branchId, status, items = [] } = req.body || {};
  if (!supplierId || !branchId) {
    return res.status(400).json({ success: false, error: 'supplierId and branchId are required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Purchase order requires at least one item' });
  }
  if (status && !parsePurchaseOrderStatus(status)) {
    return res
      .status(400)
      .json({ success: false, error: 'Invalid status. Use pending|approved|received|cancelled' });
  }
  return next();
}

function validatePurchaseOrderFilters(req, res, next) {
  const { status } = req.query || {};
  if (status && !parsePurchaseOrderStatus(status)) {
    return res
      .status(400)
      .json({ success: false, error: 'Invalid status filter. Use pending|approved|received|cancelled' });
  }
  return next();
}

function validatePurchaseOrderStatusBody(req, res, next) {
  const { status } = req.body || {};
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ success: false, error: 'status is required' });
  }
  if (!parsePurchaseOrderStatus(status)) {
    return res
      .status(400)
      .json({ success: false, error: 'Invalid status. Use pending|approved|received|cancelled' });
  }
  return next();
}

async function listOrders(req, res, next) {
  try {
    const db = req.db || prisma;
    const { branchId, customerId, cashierId, status, from, to, limit = 100 } = req.query || {};

    const where = { tenantId: req.tenant.id };
    if (branchId) where.branchId = String(branchId);
    if (customerId) where.customerId = String(customerId);
    if (cashierId) where.cashierId = String(cashierId);
    if (status) where.status = parseOrderStatus(status);

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const parsedLimit = Math.min(Math.max(toInt(limit, 100), 1), 500);

    const orders = await db.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: parsedLimit,
      include: {
        items: true,
        payments: true,
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        cashier: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    return next(error);
  }
}

async function getOrderById(req, res, next) {
  try {
    const db = req.db || prisma;
    const order = await db.order.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      include: {
        items: true,
        payments: true,
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
        cashier: { select: { id: true, name: true, role: true } },
      },
    });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const db = req.db || prisma;
    const {
      branchId = null,
      registerId = null,
      cashierId = null,
      customerId = null,
      customerName = null,
      notes = null,
      serviceMode = null,
      serviceModeLabel = null,
      deliveryAddress = null,
      deliveryPhone = null,
      deliveryRider = null,
      discountId = null,
      discountCode = null,
      items = [],
      payment = null,
    } = req.body || {};

    const tenantId = req.tenant.id;
    const resolvedCashierId = cashierId || req.user?.id || null;

    const result = await db.$transaction(async (tx) => {
      if (branchId) {
        const branch = await tx.branch.findFirst({
          where: { id: String(branchId), tenantId },
          select: { id: true },
        });
        if (!branch) throw Object.assign(new Error('Branch not found for this tenant'), { status: 400 });
      }
      if (registerId) {
        const register = await tx.register.findFirst({
          where: { id: String(registerId), tenantId },
          select: { id: true },
        });
        if (!register) throw Object.assign(new Error('Register not found for this tenant'), { status: 400 });
      }
      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: String(customerId), tenantId },
          select: { id: true },
        });
        if (!customer) throw Object.assign(new Error('Customer not found for this tenant'), { status: 400 });
      }
      if (resolvedCashierId) {
        const cashier = await tx.user.findFirst({
          where: { id: String(resolvedCashierId), tenantId, active: true },
          select: { id: true },
        });
        if (!cashier) throw Object.assign(new Error('Cashier user not found for this tenant'), { status: 400 });
      }

      let subtotal = 0;
      let taxAmount = 0;
      let lineDiscountAmount = 0;
      const itemCreates = [];
      const productIds = items.map((line) => line?.productId).filter(Boolean).map(String);
      const uniqueProductIds = [...new Set(productIds)];
      const products = uniqueProductIds.length
        ? await tx.product.findMany({
            where: { tenantId, id: { in: uniqueProductIds } },
            select: { id: true, name: true, price: true },
          })
        : [];
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const rawItem of items) {
        const productId = rawItem?.productId ? String(rawItem.productId) : null;
        const linkedProduct = productId ? productMap.get(productId) : null;
        if (productId && !linkedProduct) {
          throw Object.assign(new Error(`Product ${productId} not found for this tenant`), { status: 400 });
        }

        const qty = toInt(rawItem?.qty, 0);
        if (!Number.isFinite(qty) || qty <= 0) {
          throw Object.assign(new Error('Each order item requires qty > 0'), { status: 400 });
        }
        const unitPrice = toInt(rawItem?.unitPrice, linkedProduct ? linkedProduct.price : NaN);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw Object.assign(new Error('Each order item requires a non-negative unitPrice'), { status: 400 });
        }
        const lineDiscount = toInt(rawItem?.discount, 0);
        const lineTax = toInt(rawItem?.tax, 0);
        const lineTotal = toInt(rawItem?.total, qty * unitPrice - lineDiscount + lineTax);
        if (!Number.isFinite(lineTotal) || lineTotal < 0) {
          throw Object.assign(new Error('Each order item total must be non-negative'), { status: 400 });
        }

        subtotal += qty * unitPrice;
        taxAmount += lineTax;
        lineDiscountAmount += lineDiscount;

        itemCreates.push({
          productId,
          name: normalizeString(rawItem?.name) || linkedProduct?.name || 'Item',
          qty,
          unitPrice,
          discount: lineDiscount,
          discountPercent: Number(rawItem?.discountPercent || 0) || 0,
          tax: lineTax,
          total: lineTotal,
          rxNumber: normalizeString(rawItem?.rxNumber),
          prescriber: normalizeString(rawItem?.prescriber),
          patientDOB: normalizeString(rawItem?.patientDOB),
          controlled: Boolean(rawItem?.controlled),
          deaNumber: normalizeString(rawItem?.deaNumber),
          refillsAuthorized: toInt(rawItem?.refillsAuthorized, 0),
          refillsRemaining: toInt(rawItem?.refillsRemaining, 0),
          pickupVerified: Boolean(rawItem?.pickupVerified),
          pickupIdLast4: normalizeString(rawItem?.pickupIdLast4),
          prescriptionNotes: normalizeString(rawItem?.prescriptionNotes),
          prescriptionImage: normalizeString(rawItem?.prescriptionImage),
        });
      }

      let appliedDiscountId = null;
      let orderLevelDiscountAmount = 0;

      if (discountId || discountCode) {
        const discountWhere = { tenantId };
        if (discountId) discountWhere.id = String(discountId);
        else discountWhere.code = String(discountCode).trim();

        const discount = await tx.discount.findFirst({ where: discountWhere });
        if (!discount) {
          throw Object.assign(new Error('Discount not found for this tenant'), { status: 400 });
        }
        if (!discount.isActive) {
          throw Object.assign(new Error('Discount is inactive'), { status: 400 });
        }
        const now = new Date();
        if (discount.startDate && now < discount.startDate) {
          throw Object.assign(new Error('Discount is not active yet'), { status: 400 });
        }
        if (discount.endDate && now > discount.endDate) {
          throw Object.assign(new Error('Discount has expired'), { status: 400 });
        }

        const minOrderValue = discount.minOrderValue ? Number(discount.minOrderValue) : 0;
        if (Number.isFinite(minOrderValue) && subtotal < minOrderValue) {
          throw Object.assign(
            new Error(`Order does not meet discount minimum value of ${minOrderValue}`),
            { status: 400 },
          );
        }

        const discountType = parseDiscountType(discount.type);
        const discountValue = Number(discount.value || 0);
        if (!discountType || !Number.isFinite(discountValue) || discountValue < 0) {
          throw Object.assign(new Error('Discount configuration is invalid'), { status: 400 });
        }

        orderLevelDiscountAmount = Math.trunc(resolveDiscountAmount(discountType, discountValue, subtotal));
        appliedDiscountId = discount.id;
      }

      const discountAmount = lineDiscountAmount + orderLevelDiscountAmount;
      const total = Math.max(0, subtotal - discountAmount + taxAmount);
      const order = await tx.order.create({
        data: {
          tenantId,
          branchId: branchId ? String(branchId) : null,
          registerId: registerId ? String(registerId) : null,
          cashierId: resolvedCashierId ? String(resolvedCashierId) : null,
          customerId: customerId ? String(customerId) : null,
          discountId: appliedDiscountId,
          customerName: normalizeString(customerName),
          notes: normalizeString(notes),
          subtotal,
          taxAmount,
          discountAmount,
          taxableBase: subtotal,
          total,
          serviceMode: serviceMode || null,
          serviceModeLabel: normalizeString(serviceModeLabel),
          deliveryAddress: normalizeString(deliveryAddress),
          deliveryPhone: normalizeString(deliveryPhone),
          deliveryRider: normalizeString(deliveryRider),
          items: { create: itemCreates },
        },
        include: { items: true },
      });

      if (payment && typeof payment === 'object') {
        const paymentAmount = toInt(payment.amount, total);
        if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
          throw Object.assign(new Error('Payment amount must be a non-negative number'), { status: 400 });
        }
        await tx.payment.create({
          data: {
            tenantId,
            orderId: order.id,
            userId: resolvedCashierId ? String(resolvedCashierId) : null,
            method: payment.method || 'cash',
            amount: paymentAmount,
            paymentStatus: payment.paymentStatus || 'paid',
            transactionId: normalizeString(payment.transactionId),
            reference: normalizeString(payment.reference),
          },
        });
      }

      return tx.order.findFirst({
        where: { id: order.id, tenantId },
        include: {
          items: true,
          payments: true,
          branch: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
        },
      });
    });

    // Non-blocking compliance event enqueue; sale remains committed even if enqueue fails.
    try {
      await enqueueInvoiceForOrder({
        db,
        tenantId: req.tenant.id,
        orderId: result.id,
      });
    } catch (enqueueError) {
      console.warn(
        `[orders.createOrder] eTIMS enqueue failed for order ${result?.id || 'n/a'}: ${enqueueError.message}`,
      );
    }

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Duplicate transactionId or unique field in order payload' });
    }
    if (error?.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    return next(error);
  }
}

async function refundOrder(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const { reason = 'Order refund' } = req.body || {};
    const order = await db.order.findFirst({
      where: { id: req.params.id, tenantId },
      include: { items: true, payments: true },
    });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (order.status === 'refunded') {
      return res.status(409).json({ success: false, error: 'Order is already refunded' });
    }
    if (order.status === 'cancelled') {
      return res.status(409).json({ success: false, error: 'Cancelled orders cannot be refunded' });
    }

    const updated = await db.order.update({
      where: { id: order.id },
      data: {
        status: 'refunded',
        notes: [order.notes, normalizeString(reason)].filter(Boolean).join(' | '),
      },
      include: {
        items: true,
        payments: true,
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        cashier: { select: { id: true, name: true } },
      },
    });

    try {
      await enqueueCreditNoteForOrder({
        db,
        tenantId,
        orderId: order.id,
        reason: normalizeString(reason) || 'Order refund',
      });
    } catch (enqueueError) {
      console.warn(
        `[orders.refundOrder] eTIMS credit-note enqueue failed for order ${order.id}: ${enqueueError.message}`,
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Order refunded and credit note queued for eTIMS sync.',
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
}

async function listPurchaseOrders(req, res, next) {
  try {
    const db = req.db || prisma;
    const { supplierId, branchId, status } = req.query || {};
    const where = { tenantId: req.tenant.id };
    if (supplierId) where.supplierId = String(supplierId);
    if (branchId) where.branchId = String(branchId);
    if (status) where.status = parsePurchaseOrderStatus(status);

    const data = await db.purchaseOrder.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return next(error);
  }
}

async function getPurchaseOrderById(req, res, next) {
  try {
    const db = req.db || prisma;
    const po = await db.purchaseOrder.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      include: {
        supplier: { select: { id: true, name: true, email: true, phoneNumber: true } },
        branch: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
    if (!po) return res.status(404).json({ success: false, error: 'Purchase order not found' });
    return res.status(200).json({ success: true, data: po });
  } catch (error) {
    return next(error);
  }
}

async function createPurchaseOrder(req, res, next) {
  try {
    const db = req.db || prisma;
    const {
      supplierId,
      branchId,
      expectedDeliveryDate = null,
      notes = null,
      status = 'pending',
      items = [],
    } = req.body || {};

    const tenantId = req.tenant.id;
    const result = await db.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: String(supplierId), tenantId, isActive: true },
        select: { id: true },
      });
      if (!supplier) throw Object.assign(new Error('Supplier not found for this tenant'), { status: 400 });

      const branch = await tx.branch.findFirst({
        where: { id: String(branchId), tenantId },
        select: { id: true },
      });
      if (!branch) throw Object.assign(new Error('Branch not found for this tenant'), { status: 400 });

      const productIds = [...new Set(items.map((line) => line?.productId).filter(Boolean).map(String))];
      const products = await tx.product.findMany({
        where: { tenantId, id: { in: productIds } },
        select: { id: true, name: true, costPrice: true, price: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      const lineCreates = [];
      for (const rawItem of items) {
        const productId = String(rawItem?.productId || '');
        const linkedProduct = productMap.get(productId);
        if (!linkedProduct) {
          throw Object.assign(new Error(`Product ${productId || '(missing)'} not found for this tenant`), { status: 400 });
        }
        const quantity = toInt(rawItem?.quantity, 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw Object.assign(new Error('Each purchase order item requires quantity > 0'), { status: 400 });
        }
        const defaultUnitCost = linkedProduct.costPrice ?? linkedProduct.price ?? 0;
        const unitCost = Number(rawItem?.unitCost ?? defaultUnitCost);
        if (!Number.isFinite(unitCost) || unitCost < 0) {
          throw Object.assign(new Error('Each purchase order item requires unitCost >= 0'), { status: 400 });
        }
        const totalCost = Number(rawItem?.totalCost ?? quantity * unitCost);
        if (!Number.isFinite(totalCost) || totalCost < 0) {
          throw Object.assign(new Error('Each purchase order item totalCost must be >= 0'), { status: 400 });
        }

        totalAmount += totalCost;
        lineCreates.push({
          tenantId,
          productId,
          quantity,
          unitCost,
          totalCost,
        });
      }

      const created = await tx.purchaseOrder.create({
        data: {
          tenantId,
          supplierId: String(supplierId),
          branchId: String(branchId),
          status: parsePurchaseOrderStatus(status || 'pending'),
          totalAmount,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          notes: normalizeString(notes),
          items: { create: lineCreates },
        },
      });

      return tx.purchaseOrder.findFirst({
        where: { id: created.id, tenantId },
        include: {
          supplier: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    return next(error);
  }
}

async function updatePurchaseOrderStatus(req, res, next) {
  try {
    const db = req.db || prisma;
    const { status } = req.body || {};
    const normalizedStatus = parsePurchaseOrderStatus(status);

    const existing = await db.purchaseOrder.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }

    const updated = await db.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: normalizedStatus },
      include: {
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        items: true,
      },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateOrderFilters,
  validateCreateOrderPayload,
  validatePurchaseOrderFilters,
  validateCreatePurchaseOrderPayload,
  validatePurchaseOrderStatusBody,
  listOrders,
  getOrderById,
  createOrder,
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  refundOrder,
};
