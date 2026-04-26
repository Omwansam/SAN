const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const branchScope = require('../middleware/branch-scope.middleware');
const {
  validateOrderFilters,
  validateCreateOrderPayload,
  validatePurchaseOrderFilters,
  validateCreatePurchaseOrderPayload,
  validatePurchaseOrderStatusBody,
  listOrders,
  getOrderById,
  createOrder,
  refundOrder,
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} = require('../controllers/orders.controller');

const orderRouter = express.Router();

orderRouter.use(tenantResolver({ required: true }));
orderRouter.use(protect);

// Purchase orders + purchase order items
orderRouter.get(
  '/purchase-orders',
  authorize('manager', 'admin', 'superadmin'),
  validatePurchaseOrderFilters,
  listPurchaseOrders,
);
orderRouter.get(
  '/purchase-orders/:id',
  authorize('manager', 'admin', 'superadmin'),
  getPurchaseOrderById,
);
orderRouter.post(
  '/purchase-orders',
  authorize('manager', 'admin', 'superadmin'),
  validateCreatePurchaseOrderPayload,
  branchScope({ required: true }),
  createPurchaseOrder,
);
orderRouter.patch(
  '/purchase-orders/:id/status',
  authorize('manager', 'admin', 'superadmin'),
  validatePurchaseOrderStatusBody,
  updatePurchaseOrderStatus,
);

// Sales orders + order items
orderRouter.get(
  '/',
  authorize('cashier', 'manager', 'admin', 'superadmin'),
  validateOrderFilters,
  listOrders,
);
orderRouter.post(
  '/',
  authorize('cashier', 'manager', 'admin', 'superadmin'),
  validateCreateOrderPayload,
  createOrder,
);
orderRouter.patch(
  '/:id/refund',
  authorize('manager', 'admin', 'superadmin'),
  refundOrder,
);
orderRouter.get('/:id', authorize('cashier', 'manager', 'admin', 'superadmin'), getOrderById);

module.exports = orderRouter;
