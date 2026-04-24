const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  getReportSummary,
  getSalesReport,
  getInventoryReport,
} = require('../controllers/reports.controller');

const reportRouter = express.Router();

reportRouter.use(tenantResolver({ required: true }));
reportRouter.use(protect);
reportRouter.use(authorize('manager', 'admin', 'superadmin'));

reportRouter.get('/summary', getReportSummary);
reportRouter.get('/sales', getSalesReport);
reportRouter.get('/inventory', getInventoryReport);

module.exports = reportRouter;
