const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customers.controller');

const customerRouter = express.Router();

customerRouter.use(tenantResolver({ required: true }));
customerRouter.use(protect);

customerRouter.get('/', listCustomers);
customerRouter.get('/:id', getCustomerById);
customerRouter.post('/', authorize('cashier', 'manager', 'admin', 'superadmin'), createCustomer);
customerRouter.put('/:id', authorize('cashier', 'manager', 'admin', 'superadmin'), updateCustomer);
customerRouter.delete('/:id', authorize('admin', 'superadmin'), deleteCustomer);

module.exports = customerRouter;
