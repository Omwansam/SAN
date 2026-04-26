const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  listDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscountEligibility,
} = require('../controllers/discounts.controller');

const discountRouter = express.Router();

discountRouter.use(tenantResolver({ required: true }));
discountRouter.use(protect);

discountRouter.get('/', authorize('cashier', 'manager', 'admin', 'superadmin'), listDiscounts);
discountRouter.post(
  '/validate',
  authorize('cashier', 'manager', 'admin', 'superadmin'),
  validateDiscountEligibility,
);
discountRouter.get('/:id', authorize('cashier', 'manager', 'admin', 'superadmin'), getDiscountById);
discountRouter.post('/', authorize('manager', 'admin', 'superadmin'), createDiscount);
discountRouter.put('/:id', authorize('manager', 'admin', 'superadmin'), updateDiscount);
discountRouter.delete('/:id', authorize('admin', 'superadmin'), deleteDiscount);

module.exports = discountRouter;

