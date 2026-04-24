const express = require("express");
const {
  registerUser,
  registerAdmin,
  loginUser,
  logoutUser,
  getMe,
  refreshToken,
  verifySessionUnlockPin,
  verifyManagerPin,
} = require("../controllers/auth.controller");
const protect = require("../middleware/protect.middleware");
const authorize = require("../middleware/authorize.middleware");
const tenantResolver = require('../middleware/tenant.middleware');

const authRouter = express.Router();

authRouter.post('/register', tenantResolver({ required: true }), registerUser);

authRouter.post(
  '/admin/register',
  tenantResolver({ required: true }),
  protect,
  authorize('admin', 'superadmin'),
  registerAdmin,
);

authRouter.post('/login', tenantResolver({ required: true }), loginUser);
authRouter.post('/logout', tenantResolver({ required: false }), logoutUser);
authRouter.get('/me', tenantResolver({ required: true }), protect, getMe);
authRouter.post('/refresh', tenantResolver({ required: true }), protect, refreshToken);
authRouter.post(
  '/verify-session-pin',
  tenantResolver({ required: true }),
  protect,
  verifySessionUnlockPin,
);
authRouter.post(
  '/verify-manager-pin',
  tenantResolver({ required: true }),
  protect,
  verifyManagerPin,
);

module.exports = authRouter;