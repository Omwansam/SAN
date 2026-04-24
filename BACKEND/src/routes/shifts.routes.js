const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  listShifts,
  getActiveShift,
  createShift,
  closeShift,
} = require('../controllers/shifts.controller');

const shiftRouter = express.Router();

shiftRouter.use(tenantResolver({ required: true }));
shiftRouter.use(protect);

shiftRouter.get('/', authorize('manager', 'admin', 'superadmin'), listShifts);
shiftRouter.get('/active', authorize('manager', 'admin', 'superadmin'), getActiveShift);
shiftRouter.post('/', authorize('manager', 'admin', 'superadmin'), createShift);
shiftRouter.post('/:id/close', authorize('manager', 'admin', 'superadmin'), closeShift);

module.exports = shiftRouter;
