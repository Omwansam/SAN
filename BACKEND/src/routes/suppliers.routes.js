const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/suppliers.controller');

const supplierRouter = express.Router();

supplierRouter.use(tenantResolver({ required: true }));
supplierRouter.use(protect);

supplierRouter.get('/', listSuppliers);
supplierRouter.get('/:id', getSupplierById);
supplierRouter.post('/', authorize('manager', 'admin', 'superadmin'), createSupplier);
supplierRouter.put('/:id', authorize('manager', 'admin', 'superadmin'), updateSupplier);
supplierRouter.delete('/:id', authorize('admin', 'superadmin'), deleteSupplier);

module.exports = supplierRouter;
