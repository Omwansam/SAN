const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const onboardingLogger = require('../middleware/onboarding-logger.middleware');
const {
  createDraft,
  saveStep1,
  saveStep2,
  sendOtp,
  verifyOtp,
  completeOnboarding,
  updateBusinessType,
} = require('../controllers/onboarding.controller');

const onboardingRouter = express.Router();
onboardingRouter.use(onboardingLogger);

onboardingRouter.post('/draft', createDraft);
onboardingRouter.patch('/draft/:id/step-1', saveStep1);
onboardingRouter.patch('/draft/:id/step-2', saveStep2);
onboardingRouter.post('/draft/:id/send-otp', sendOtp);
onboardingRouter.post('/draft/:id/verify-otp', verifyOtp);
onboardingRouter.post('/draft/:id/complete', completeOnboarding);
onboardingRouter.patch(
  '/business-type',
  tenantResolver({ required: true }),
  protect,
  updateBusinessType,
);

module.exports = onboardingRouter;

