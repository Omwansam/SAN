const { prisma } = require('../config/db');
const {
  processPendingFiscalJobs,
  testEtimsConnection,
} = require('../services/etims.service');

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeBoolean(value, fallback = undefined) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

function parseEnvironment(env) {
  if (env === undefined) return undefined;
  const normalized = String(env).trim().toLowerCase();
  if (normalized === 'sandbox' || normalized === 'production') return normalized;
  return null;
}

async function getEtimsOverview(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const [profile, configs, deviceCount, fiscalCounts, syncCounts] = await Promise.all([
      db.taxPayerProfile.findUnique({ where: { tenantId } }),
      db.etimsConfig.findMany({
        where: { tenantId },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      db.kraDevice.count({ where: { tenantId, active: true } }),
      db.fiscalDocument.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      db.fiscalSyncJob.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        taxpayerProfile: profile,
        configs,
        activeDeviceCount: deviceCount,
        fiscalDocumentCounts: fiscalCounts,
        syncJobCounts: syncCounts,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function upsertTaxPayerProfile(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const {
      kraPin,
      legalName,
      vatRegistered = true,
      vatObligation,
      taxOffice,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!kraPin || !String(kraPin).trim()) {
      return res.status(400).json({ success: false, error: 'kraPin is required.' });
    }
    if (!legalName || !String(legalName).trim()) {
      return res.status(400).json({ success: false, error: 'legalName is required.' });
    }

    const vatRegisteredBool = normalizeBoolean(vatRegistered, true);
    if (vatRegisteredBool === null) {
      return res.status(400).json({ success: false, error: 'vatRegistered must be true or false.' });
    }

    const profile = await db.taxPayerProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        kraPin: String(kraPin).trim().toUpperCase(),
        legalName: String(legalName).trim(),
        vatRegistered: vatRegisteredBool,
        vatObligation: normalizeOptionalString(vatObligation) ?? null,
        taxOffice: normalizeOptionalString(taxOffice) ?? null,
        contactEmail: normalizeOptionalString(contactEmail) ?? null,
        contactPhone: normalizeOptionalString(contactPhone) ?? null,
      },
      update: {
        kraPin: String(kraPin).trim().toUpperCase(),
        legalName: String(legalName).trim(),
        vatRegistered: vatRegisteredBool,
        vatObligation: normalizeOptionalString(vatObligation),
        taxOffice: normalizeOptionalString(taxOffice),
        contactEmail: normalizeOptionalString(contactEmail),
        contactPhone: normalizeOptionalString(contactPhone),
      },
    });

    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    return next(error);
  }
}

async function upsertEtimsConfig(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const {
      branchId = null,
      environment = 'sandbox',
      endpointBaseUrl,
      apiKey,
      apiSecret,
      clientId,
      certSerial,
      certFingerprint,
      active = true,
      readinessMode = true,
      strictMode = false,
    } = req.body || {};

    const env = parseEnvironment(environment);
    if (!env) {
      return res.status(400).json({ success: false, error: 'environment must be sandbox or production.' });
    }
    const activeBool = normalizeBoolean(active, true);
    const readinessBool = normalizeBoolean(readinessMode, true);
    const strictBool = normalizeBoolean(strictMode, false);
    if ([activeBool, readinessBool, strictBool].some((v) => v === null)) {
      return res.status(400).json({
        success: false,
        error: 'active, readinessMode and strictMode must be booleans.',
      });
    }

    if (branchId) {
      const branch = await db.branch.findFirst({
        where: { id: String(branchId), tenantId },
        select: { id: true },
      });
      if (!branch) {
        return res.status(400).json({ success: false, error: 'Branch not found in tenant scope.' });
      }
    }

    const existing = await db.etimsConfig.findFirst({
      where: {
        tenantId,
        branchId: branchId ? String(branchId) : null,
      },
      select: { id: true },
    });

    const data = {
      tenantId,
      branchId: branchId ? String(branchId) : null,
      environment: env,
      endpointBaseUrl: normalizeOptionalString(endpointBaseUrl) ?? null,
      apiKey: normalizeOptionalString(apiKey) ?? null,
      apiSecret: normalizeOptionalString(apiSecret) ?? null,
      clientId: normalizeOptionalString(clientId) ?? null,
      certSerial: normalizeOptionalString(certSerial) ?? null,
      certFingerprint: normalizeOptionalString(certFingerprint) ?? null,
      active: activeBool,
      readinessMode: readinessBool,
      strictMode: strictBool,
    };

    const configRow = existing
      ? await db.etimsConfig.update({
          where: { id: existing.id },
          data,
        })
      : await db.etimsConfig.create({ data });

    return res.status(existing ? 200 : 201).json({ success: true, data: configRow });
  } catch (error) {
    return next(error);
  }
}

async function listFiscalDocuments(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const {
      status,
      docType,
      orderId,
      branchId,
      limit = 100,
      offset = 0,
    } = req.query || {};

    const where = { tenantId };
    if (status) where.status = String(status).trim().toLowerCase();
    if (docType) where.docType = String(docType).trim().toLowerCase();
    if (orderId) where.orderId = String(orderId);
    if (branchId) where.branchId = String(branchId);

    const parsedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const parsedOffset = Math.max(Number(offset) || 0, 0);

    const [count, data] = await Promise.all([
      db.fiscalDocument.count({ where }),
      db.fiscalDocument.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: parsedLimit,
        skip: parsedOffset,
        include: {
          order: {
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true,
            },
          },
          jobs: {
            orderBy: [{ createdAt: 'desc' }],
            take: 3,
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getFiscalDocumentById(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const doc = await db.fiscalDocument.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        lines: true,
        jobs: {
          orderBy: [{ createdAt: 'desc' }],
        },
        order: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Fiscal document not found.' });
    }
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    return next(error);
  }
}

async function retryFiscalDocument(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const existing = await db.fiscalDocument.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Fiscal document not found.' });
    }

    const updatedDoc = await db.fiscalDocument.update({
      where: { id: existing.id },
      data: {
        status: 'queued',
        errorMessage: null,
      },
    });
    const job = await db.fiscalSyncJob.create({
      data: {
        tenantId,
        fiscalDocumentId: existing.id,
        status: 'pending',
        attempts: 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Fiscal document queued for retry.',
      data: { fiscalDocument: updatedDoc, job },
    });
  } catch (error) {
    return next(error);
  }
}

async function runFiscalSyncNow(req, res, next) {
  try {
    const { limit = 25 } = req.body || {};
    const processed = await processPendingFiscalJobs({
      limit: Math.min(Math.max(Number(limit) || 25, 1), 100),
    });
    return res.status(200).json({ success: true, data: processed });
  } catch (error) {
    return next(error);
  }
}

async function testConnection(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenantId = req.tenant.id;
    const { branchId = null } = req.body || {};
    const result = await testEtimsConnection({
      db,
      tenantId,
      branchId: branchId ? String(branchId) : null,
    });
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getEtimsOverview,
  upsertTaxPayerProfile,
  upsertEtimsConfig,
  listFiscalDocuments,
  getFiscalDocumentById,
  retryFiscalDocument,
  runFiscalSyncNow,
  testConnection,
};

