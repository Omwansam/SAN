const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  getEtimsOverview,
  upsertTaxPayerProfile,
  upsertEtimsConfig,
  listFiscalDocuments,
  getFiscalDocumentById,
  retryFiscalDocument,
  runFiscalSyncNow,
  testConnection,
} = require('../controllers/etims.controller');

const etimsRouter = express.Router();

etimsRouter.use(tenantResolver({ required: true }));
etimsRouter.use(protect);

etimsRouter.get('/overview', authorize('manager', 'admin', 'superadmin'), getEtimsOverview);
etimsRouter.put('/taxpayer-profile', authorize('admin', 'superadmin'), upsertTaxPayerProfile);
etimsRouter.put('/config', authorize('admin', 'superadmin'), upsertEtimsConfig);
etimsRouter.post('/test-connection', authorize('admin', 'superadmin'), testConnection);

etimsRouter.get('/documents', authorize('manager', 'admin', 'superadmin'), listFiscalDocuments);
etimsRouter.get('/documents/:id', authorize('manager', 'admin', 'superadmin'), getFiscalDocumentById);
etimsRouter.post('/documents/:id/retry', authorize('admin', 'superadmin'), retryFiscalDocument);

etimsRouter.post('/sync/run', authorize('admin', 'superadmin'), runFiscalSyncNow);

module.exports = etimsRouter;

