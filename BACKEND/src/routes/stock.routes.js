const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const { listStockLogs, createStockLog } = require('../controllers/stock.controller');

const stockRouter = express.Router();

stockRouter.use(tenantResolver({ required: true }));
stockRouter.use(protect);

stockRouter.get('/', authorize('manager', 'admin', 'superadmin'), listStockLogs);
stockRouter.post('/', authorize('manager', 'admin', 'superadmin'), createStockLog);

module.exports = stockRouter;
