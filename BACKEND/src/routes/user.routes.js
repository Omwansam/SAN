const express = require('express');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const tenantResolver = require('../middleware/tenant.middleware');
const branchScope = require('../middleware/branch-scope.middleware');
const {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  deleteUser,
  createUser,
  updateUserAdmin,
  setMyPin,
} = require('../controllers/user.controller');

const userRouter = express.Router();

// Tenant context -> auth -> optional branch scope
userRouter.use(tenantResolver({ required: true }));
userRouter.use(protect);
userRouter.use(branchScope({ required: false }));

// user routes
userRouter.get('/profile', getProfile);
userRouter.put('/profile', updateProfile);
userRouter.put('/change-password', changePassword);
userRouter.put('/pin', setMyPin);

// admin routes
userRouter.use(authorize('admin', 'superadmin'));
userRouter.get('/', getAllUsers);
userRouter.post('/', createUser);
userRouter.patch('/:id', updateUserAdmin);
userRouter.delete('/:id', deleteUser);

module.exports = userRouter;