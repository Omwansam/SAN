const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  listTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
} = require('../controllers/taxrates.controller');

const taxRateRouter = express.Router();

taxRateRouter.use(tenantResolver({ required: true }));
taxRateRouter.use(protect);

taxRateRouter.get('/', listTaxRates);
taxRateRouter.get('/:id', getTaxRateById);
taxRateRouter.post('/', authorize('admin', 'superadmin'), createTaxRate);
taxRateRouter.put('/:id', authorize('admin', 'superadmin'), updateTaxRate);
taxRateRouter.delete('/:id', authorize('admin', 'superadmin'), deleteTaxRate);

module.exports = taxRateRouter;
