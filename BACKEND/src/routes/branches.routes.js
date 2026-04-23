const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const branchScope = require('../middleware/branch-scope.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  listBranchUsers,
  assignUserToBranch,
  removeUserFromBranch,
  setUserBranchAccess,
} = require('../controllers/branch.controller');

const branchRouter = express.Router();

branchRouter.use(tenantResolver({ required: true }));
branchRouter.use(protect);

branchRouter.get('/', listBranches);
branchRouter.post('/', authorize('admin', 'superadmin', 'manager'), createBranch);

branchRouter.get('/:branchId', branchScope({ required: true, paramKey: 'branchId' }), getBranchById);
branchRouter.put(
  '/:branchId',
  authorize('admin', 'superadmin', 'manager'),
  branchScope({ required: true, paramKey: 'branchId' }),
  updateBranch,
);
branchRouter.delete(
  '/:branchId',
  authorize('admin', 'superadmin'),
  branchScope({ required: true, paramKey: 'branchId' }),
  deleteBranch,
);

branchRouter.get(
  '/:branchId/users',
  authorize('admin', 'superadmin'),
  branchScope({ required: true, paramKey: 'branchId' }),
  listBranchUsers,
);
branchRouter.post(
  '/:branchId/users/:userId',
  authorize('admin', 'superadmin'),
  branchScope({ required: true, paramKey: 'branchId' }),
  assignUserToBranch,
);
branchRouter.delete(
  '/:branchId/users/:userId',
  authorize('admin', 'superadmin'),
  branchScope({ required: true, paramKey: 'branchId' }),
  removeUserFromBranch,
);
branchRouter.put(
  '/users/:userId/access',
  authorize('admin', 'superadmin'),
  setUserBranchAccess,
);

module.exports = branchRouter;
