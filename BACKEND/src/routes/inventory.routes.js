const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const { listInventory, adjustInventory } = require('../controllers/inventory.controller');
const { listStockLogs } = require('../controllers/stock.controller');

const inventoryRouter = express.Router();

inventoryRouter.use(tenantResolver({ required: true }));
inventoryRouter.use(protect);

inventoryRouter.get('/', authorize('manager', 'admin', 'superadmin'), listInventory);
inventoryRouter.get('/logs', authorize('manager', 'admin', 'superadmin'), listStockLogs);
inventoryRouter.post('/adjust', authorize('manager', 'admin', 'superadmin'), adjustInventory);

module.exports = inventoryRouter;
