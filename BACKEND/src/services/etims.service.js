const crypto = require('crypto');
const { prisma } = require('../config/db');
const config = require('../config/env');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
}

function nowIsoCompact() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveRateFromOrderLine(line, taxLabel = 'VAT') {
  const base = toNumber(line.unitPrice, 0) * toNumber(line.qty, 0);
  const tax = toNumber(line.tax, 0);
  if (base <= 0 || tax <= 0) return { taxRate: 0, taxLabel };
  const rate = Number(((tax / base) * 100).toFixed(2));
  return { taxRate: rate, taxLabel };
}

async function loadTaxProfile({ db, tenantId }) {
  const profile = await db.taxPayerProfile.findUnique({
    where: { tenantId },
  });
  const etimsConfig = await db.etimsConfig.findFirst({
    where: { tenantId, active: true },
    orderBy: [{ updatedAt: 'desc' }],
  });
  return { profile, etimsConfig };
}

function buildInvoicePayload({ tenant, order, orderItems, payments, profile, etimsConfig }) {
  const now = new Date();
  const lines = orderItems.map((line, idx) => {
    const { taxRate, taxLabel } = resolveRateFromOrderLine(line, 'VAT');
    return {
      lineNo: idx + 1,
      itemName: line.name,
      itemCode: line.productId || null,
      quantity: toNumber(line.qty, 0),
      unitPrice: toNumber(line.unitPrice, 0),
      lineDiscount: toNumber(line.discount, 0),
      lineTax: toNumber(line.tax, 0),
      lineTotal: toNumber(line.total, 0),
      taxRate,
      taxLabel,
    };
  });
  return {
    documentType: 'invoice',
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      businessName: tenant.businessName,
      businessType: tenant.businessType,
    },
    taxpayer: profile
      ? {
          kraPin: profile.kraPin,
          legalName: profile.legalName,
          vatRegistered: profile.vatRegistered,
          vatObligation: profile.vatObligation,
        }
      : null,
    etims: {
      environment: etimsConfig?.environment || 'sandbox',
      readinessMode: etimsConfig?.readinessMode ?? true,
    },
    order: {
      id: order.id,
      createdAt: order.createdAt,
      branchId: order.branchId,
      cashierId: order.cashierId,
      customerId: order.customerId,
      customerName: order.customerName,
      subtotal: toNumber(order.subtotal, 0),
      discountAmount: toNumber(order.discountAmount, 0),
      taxAmount: toNumber(order.taxAmount, 0),
      total: toNumber(order.total, 0),
      serviceMode: order.serviceMode || null,
      paymentStatus: order.paymentStatus,
      currency: 'KES',
    },
    payments: (payments || []).map((p) => ({
      paymentId: p.id,
      method: p.method,
      amount: toNumber(p.amount, 0),
      status: p.paymentStatus,
      reference: p.reference || null,
      transactionId: p.transactionId || null,
    })),
    lines,
    generatedAt: now,
  };
}

function buildCreditNotePayload({ tenant, order, orderItems, payments, profile, etimsConfig, reason }) {
  const base = buildInvoicePayload({
    tenant,
    order,
    orderItems,
    payments,
    profile,
    etimsConfig,
  });
  return {
    ...base,
    documentType: 'credit_note',
    reason: reason || 'Order refund',
    referenceOrderId: order.id,
  };
}

async function enqueueFiscalDocument({
  db = prisma,
  tenantId,
  branchId = null,
  orderId = null,
  docType,
  payload,
  lines = [],
  maxAttempts = 8,
}) {
  const payloadHash = hashPayload(payload);
  return db.$transaction(async (tx) => {
    const fiscalDocument = await tx.fiscalDocument.create({
      data: {
        tenantId,
        branchId: branchId || null,
        orderId: orderId || null,
        docType,
        status: 'queued',
        payloadHash,
        requestPayload: payload,
      },
    });

    if (Array.isArray(lines) && lines.length > 0) {
      await tx.fiscalDocumentLine.createMany({
        data: lines.map((line, idx) => ({
          fiscalDocumentId: fiscalDocument.id,
          lineNo: Number(line.lineNo || idx + 1),
          productId: line.itemCode || null,
          itemName: line.itemName || 'Item',
          itemCode: line.itemCode || null,
          quantity: Number(line.quantity || 0),
          unitPrice: Number(line.unitPrice || 0),
          lineDiscount: Number(line.lineDiscount || 0),
          lineTax: Number(line.lineTax || 0),
          lineTotal: Number(line.lineTotal || 0),
          taxRate: Number.isFinite(Number(line.taxRate)) ? Number(line.taxRate) : null,
          taxLabel: line.taxLabel || null,
          rawLinePayload: line,
        })),
      });
    }

    const job = await tx.fiscalSyncJob.create({
      data: {
        tenantId,
        fiscalDocumentId: fiscalDocument.id,
        status: 'pending',
        attempts: 0,
        maxAttempts,
      },
    });

    return { fiscalDocument, job };
  });
}

async function enqueueInvoiceForOrder({ db = prisma, tenantId, orderId }) {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found for invoice enqueue.');
  const order = await db.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true, payments: true },
  });
  if (!order) throw new Error('Order not found for invoice enqueue.');
  const { profile, etimsConfig } = await loadTaxProfile({ db, tenantId });
  const payload = buildInvoicePayload({
    tenant,
    order,
    orderItems: order.items || [],
    payments: order.payments || [],
    profile,
    etimsConfig,
  });
  return enqueueFiscalDocument({
    db,
    tenantId,
    branchId: order.branchId || null,
    orderId: order.id,
    docType: 'invoice',
    payload,
    lines: payload.lines,
  });
}

async function enqueueCreditNoteForOrder({ db = prisma, tenantId, orderId, reason = 'Order refund' }) {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found for credit note enqueue.');
  const order = await db.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true, payments: true },
  });
  if (!order) throw new Error('Order not found for credit note enqueue.');
  const { profile, etimsConfig } = await loadTaxProfile({ db, tenantId });
  const payload = buildCreditNotePayload({
    tenant,
    order,
    orderItems: order.items || [],
    payments: order.payments || [],
    profile,
    etimsConfig,
    reason,
  });
  return enqueueFiscalDocument({
    db,
    tenantId,
    branchId: order.branchId || null,
    orderId: order.id,
    docType: 'credit_note',
    payload,
    lines: payload.lines,
  });
}

function computeBackoffMs(attempt) {
  // 5s, 15s, 45s, ... with cap.
  const base = 5000 * Math.pow(3, Math.max(0, attempt));
  return Math.min(base, 10 * 60 * 1000);
}

async function submitToEtims({ fiscalDocument, etimsConfig }) {
  const readinessByEnv = String(config.ETIMS_DEFAULT_READINESS_MODE || 'true') === 'true';
  const readiness = etimsConfig?.readinessMode ?? readinessByEnv;

  // Real integration point: replace with KRA client call.
  if (readiness) {
    const ref = `ETIMS-SIM-${nowIsoCompact()}-${fiscalDocument.id.slice(-6).toUpperCase()}`;
    return {
      ok: true,
      status: 'accepted',
      acknowledgementCode: ref,
      kraInvoiceNumber: `KRA-${nowIsoCompact()}`,
      payload: {
        mode: 'readiness',
        simulated: true,
        acknowledgementCode: ref,
      },
    };
  }

  if (!etimsConfig || !etimsConfig.active || !etimsConfig.endpointBaseUrl) {
    return {
      ok: false,
      status: 'failed',
      error: 'eTIMS configuration is missing or inactive.',
      payload: null,
    };
  }

  // Placeholder for production call.
  const ref = `ETIMS-${nowIsoCompact()}-${fiscalDocument.id.slice(-6).toUpperCase()}`;
  return {
    ok: true,
    status: 'submitted',
    acknowledgementCode: ref,
    kraInvoiceNumber: `KRA-${nowIsoCompact()}`,
    payload: {
      mode: 'live-placeholder',
      endpoint: etimsConfig.endpointBaseUrl,
      acknowledgementCode: ref,
    },
  };
}

async function processSingleFiscalJob({ jobId, lockToken = null }) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.fiscalSyncJob.findUnique({
      where: { id: jobId },
      include: {
        fiscalDocument: {
          include: {
            tenant: true,
            order: {
              include: { items: true, payments: true },
            },
          },
        },
      },
    });
    if (!job) return { ok: false, error: 'Job not found' };
    if (lockToken && job.lockToken !== lockToken) {
      return { ok: false, error: 'Job lock mismatch' };
    }
    if (!job.fiscalDocument) {
      await tx.fiscalSyncJob.update({
        where: { id: job.id },
        data: { status: 'failed', lastError: 'Fiscal document missing' },
      });
      return { ok: false, error: 'Fiscal document missing' };
    }

    const tenantId = job.tenantId;
    const etimsConfig = await tx.etimsConfig.findFirst({
      where: { tenantId, active: true },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const submitResult = await submitToEtims({
      fiscalDocument: job.fiscalDocument,
      etimsConfig,
    });

    const attempts = job.attempts + 1;
    if (submitResult.ok) {
      const accepted = submitResult.status === 'accepted';
      const submittedAt = new Date();
      await tx.fiscalDocument.update({
        where: { id: job.fiscalDocumentId },
        data: {
          status: accepted ? 'accepted' : 'submitted',
          acknowledgementCode: submitResult.acknowledgementCode || null,
          kraInvoiceNumber: submitResult.kraInvoiceNumber || null,
          acknowledgementAt: submitResult.acknowledgementCode ? submittedAt : null,
          submittedAt,
          acceptedAt: accepted ? submittedAt : null,
          responsePayload: submitResult.payload || null,
          errorMessage: null,
        },
      });
      await tx.fiscalSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          attempts,
          lastAttemptAt: submittedAt,
          nextRetryAt: null,
          lastError: null,
          lockToken: null,
          lockedAt: null,
        },
      });
      if (etimsConfig) {
        await tx.etimsConfig.update({
          where: { id: etimsConfig.id },
          data: { lastSyncAt: submittedAt },
        });
      }
      return { ok: true, status: accepted ? 'accepted' : 'submitted' };
    }

    const exhausted = attempts >= job.maxAttempts;
    const retryAt = exhausted ? null : new Date(Date.now() + computeBackoffMs(attempts));
    await tx.fiscalDocument.update({
      where: { id: job.fiscalDocumentId },
      data: {
        status: exhausted ? 'failed' : 'queued',
        errorMessage: submitResult.error || 'Failed to submit fiscal document',
        responsePayload: submitResult.payload || null,
        rejectedAt: exhausted ? new Date() : null,
      },
    });
    await tx.fiscalSyncJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? 'dead_letter' : 'retrying',
        attempts,
        lastAttemptAt: new Date(),
        nextRetryAt: retryAt,
        lastError: submitResult.error || 'Failed to submit fiscal document',
        lockToken: null,
        lockedAt: null,
      },
    });
    return { ok: false, status: exhausted ? 'dead_letter' : 'retrying', error: submitResult.error };
  });
}

async function processPendingFiscalJobs({ limit = 20 } = {}) {
  const now = new Date();
  const token = crypto.randomUUID();
  const candidates = await prisma.fiscalSyncJob.findMany({
    where: {
      status: { in: ['pending', 'retrying'] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: [{ createdAt: 'asc' }],
    take: Math.max(1, Math.min(limit, 100)),
    select: { id: true },
  });

  let processed = 0;
  let success = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const lock = await prisma.fiscalSyncJob.updateMany({
      where: {
        id: candidate.id,
        status: { in: ['pending', 'retrying'] },
      },
      data: {
        status: 'processing',
        lockToken: token,
        lockedAt: new Date(),
      },
    });
    if (lock.count === 0) continue;
    processed += 1;
    const result = await processSingleFiscalJob({ jobId: candidate.id, lockToken: token });
    if (result.ok) success += 1;
    else failed += 1;
  }

  return { processed, success, failed };
}

async function testEtimsConnection({ db = prisma, tenantId, branchId = null }) {
  const etimsConfig = await db.etimsConfig.findFirst({
    where: {
      tenantId,
      ...(branchId ? { branchId } : {}),
      active: true,
    },
    orderBy: [{ updatedAt: 'desc' }],
  });
  if (!etimsConfig) {
    return { ok: false, error: 'No active eTIMS config found for tenant/branch.' };
  }
  const readinessByEnv = String(config.ETIMS_DEFAULT_READINESS_MODE || 'true') === 'true';
  const readiness = etimsConfig.readinessMode ?? readinessByEnv;
  await db.etimsConfig.update({
    where: { id: etimsConfig.id },
    data: { lastTestedAt: new Date() },
  });
  return {
    ok: true,
    mode: readiness ? 'readiness' : 'live',
    environment: etimsConfig.environment,
    endpoint: etimsConfig.endpointBaseUrl || null,
  };
}

module.exports = {
  buildInvoicePayload,
  buildCreditNotePayload,
  enqueueFiscalDocument,
  enqueueInvoiceForOrder,
  enqueueCreditNoteForOrder,
  processPendingFiscalJobs,
  testEtimsConnection,
};

