const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');
const { createOtpCode, hashOtp } = require('../services/onboarding.service');
const { signAccessToken, createAuthSession, jwtExpiresToMs } = require('../services/auth.service');
const config = require('../config/env');

const COOKIE_NAME = 'token';

function schemaNameFromSlug(slug) {
  const normalized = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `tenant_${normalized || 'workspace'}`;
}

function cookieOptions() {
  return {
    maxAge: jwtExpiresToMs(config.JWT_EXPIRES_IN || '1d'),
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
  };
}

function normalizePin(rawPin) {
  if (rawPin === undefined || rawPin === null) return null;
  const pin = String(rawPin).trim();
  if (!pin) return null;
  if (!/^\d{4,8}$/.test(pin)) return null;
  return pin;
}

async function createDraft(req, res, next) {
  try {
    const db = req.db || prisma;
    const {
      adminFirstName,
      adminLastName,
      adminEmail,
      phoneCountryIso = 'KE',
      adminPhoneLocal,
      adminPhoneFull,
      password,
      adminPassword,
      passwordScore = null,
      agreeTerms = false,
    } = req.body;
    const suppliedPassword = password || adminPassword;

    if (!adminFirstName || !adminLastName || !adminEmail || !suppliedPassword || !agreeTerms) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, password and terms acceptance are required.',
      });
    }

    const passwordHash = await bcrypt.hash(String(suppliedPassword), 10);
    const draft = await db.onboardingDraft.create({
      data: {
        currentStep: 'create_account',
        adminFirstName: String(adminFirstName).trim(),
        adminLastName: String(adminLastName).trim(),
        adminEmail: String(adminEmail).trim().toLowerCase(),
        phoneCountryIso: String(phoneCountryIso).trim().toUpperCase(),
        adminPhoneLocal: adminPhoneLocal ? String(adminPhoneLocal).trim() : null,
        adminPhoneFull: adminPhoneFull ? String(adminPhoneFull).trim() : null,
        passwordHash,
        passwordScore: Number.isFinite(Number(passwordScore)) ? Number(passwordScore) : null,
        termsAcceptedAt: new Date(),
      },
      select: { id: true, status: true, currentStep: true, adminEmail: true },
    });
    return res.status(201).json({ success: true, draft });
  } catch (error) {
    return next(error);
  }
}

async function saveStep1(req, res, next) {
  try {
    const db = req.db || prisma;
    const { id } = req.params;
    const { workspaceSlug, slug, businessName, industry, businessSize, businessWebsite, website } = req.body;
    const resolvedSlug = workspaceSlug || slug;
    const resolvedWebsite = businessWebsite ?? website;
    if (!resolvedSlug || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'workspaceSlug and businessName are required.',
      });
    }
    const updated = await db.onboardingDraft.update({
      where: { id },
      data: {
        currentStep: 'business_details',
        workspaceSlug: String(resolvedSlug).trim().toLowerCase(),
        businessName: String(businessName).trim(),
        industry: industry ? String(industry).trim() : null,
        businessSize: businessSize ? String(businessSize).trim() : null,
        businessWebsite: resolvedWebsite ? String(resolvedWebsite).trim() : null,
      },
      select: { id: true, currentStep: true, workspaceSlug: true, businessName: true },
    });
    return res.status(200).json({ success: true, draft: updated });
  } catch (error) {
    return next(error);
  }
}

async function saveStep2(req, res, next) {
  try {
    const db = req.db || prisma;
    const { id } = req.params;
    const { billingPlanInterval, billingPlan = 'monthly', trialDays = 14 } = req.body;
    const planRaw = billingPlanInterval || billingPlan;
    const plan = String(planRaw).toLowerCase() === 'annual' ? 'annual' : 'monthly';
    const trialEndsAt = new Date(Date.now() + Number(trialDays || 14) * 24 * 60 * 60 * 1000);

    const updated = await db.onboardingDraft.update({
      where: { id },
      data: {
        currentStep: 'billing',
        billingPlanInterval: plan,
        trialEndsAt,
      },
      select: { id: true, currentStep: true, billingPlanInterval: true, trialEndsAt: true },
    });
    return res.status(200).json({ success: true, draft: updated });
  } catch (error) {
    return next(error);
  }
}

async function sendOtp(req, res, next) {
  try {
    const db = req.db || prisma;
    const { id } = req.params;
    const draft = await db.onboardingDraft.findUnique({
      where: { id },
      select: { id: true, adminEmail: true, workspaceSlug: true, resendCount: true },
    });
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Onboarding draft not found.' });
    }

    // Development convenience: stable OTP for faster local testing.
    const code = config.NODE_ENV === 'development' ? '123456' : createOtpCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.emailVerificationChallenge.create({
      data: {
        email: draft.adminEmail,
        slug: draft.workspaceSlug || null,
        codeHash,
        expiresAt,
      },
    });

    const resendCount = (draft.resendCount || 0) + 1;
    await db.onboardingDraft.update({
      where: { id },
      data: {
        currentStep: 'verify_email',
        verificationCodeHash: codeHash,
        verificationSentAt: new Date(),
        resendCount,
        resendAvailableAt: new Date(Date.now() + 26 * 1000),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code sent.',
      // Dev-only convenience; remove in production integration.
      code: config.NODE_ENV === 'development' ? code : undefined,
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const db = req.db || prisma;
    const { id } = req.params;
    const { code, verificationCode } = req.body;
    const rawCode = String(code || verificationCode || '').trim();
    if (!rawCode) {
      return res.status(400).json({ success: false, error: 'Verification code is required.' });
    }
    const draft = await db.onboardingDraft.findUnique({
      where: { id },
      select: { id: true, adminEmail: true, workspaceSlug: true, verificationCodeHash: true },
    });
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Onboarding draft not found.' });
    }

    if (config.NODE_ENV === 'development' && rawCode === '123456') {
      await db.onboardingDraft.update({
        where: { id },
        data: {
          currentStep: 'setting_up',
          emailVerifiedAt: new Date(),
          verificationCodeHash: hashOtp(rawCode),
        },
      });
      return res.status(200).json({ success: true, message: 'Email verified (dev fixed OTP).' });
    }

    const hashed = hashOtp(rawCode);
    const challenge = await db.emailVerificationChallenge.findFirst({
      where: {
        email: draft.adminEmail,
        slug: draft.workspaceSlug || null,
        codeHash: hashed,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
    }

    await db.$transaction([
      db.emailVerificationChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      db.onboardingDraft.update({
        where: { id },
        data: {
          currentStep: 'setting_up',
          emailVerifiedAt: new Date(),
          verificationCodeHash: hashed,
        },
      }),
    ]);

    return res.status(200).json({ success: true, message: 'Email verified.' });
  } catch (error) {
    return next(error);
  }
}

async function completeOnboarding(req, res, next) {
  try {
    const db = req.db || prisma;
    const { id } = req.params;
    const {
      includeSampleData = true,
      businessType = 'retail',
      businessTypeConfirmed = false,
      workspaceInitialized = false,
      modules = null,
      adminPin,
    } = req.body || {};
    const draft = await db.onboardingDraft.findUnique({ where: { id } });
    if (!draft) {
      console.warn(`[onboarding.complete] draft not found: ${id}`);
      return res.status(404).json({ success: false, error: 'Onboarding draft not found.' });
    }
    if (!draft.emailVerifiedAt) {
      console.warn(`[onboarding.complete] email not verified for draft: ${id}`);
      return res.status(400).json({ success: false, error: 'Email must be verified before completion.' });
    }
    if (!draft.workspaceSlug || !draft.businessName || !draft.passwordHash) {
      console.warn(`[onboarding.complete] incomplete draft: ${id}`);
      return res.status(400).json({ success: false, error: 'Draft is incomplete for provisioning.' });
    }

    const existingTenant = await db.tenant.findUnique({ where: { slug: draft.workspaceSlug } });
    if (existingTenant) {
      console.warn(`[onboarding.complete] slug already taken: ${draft.workspaceSlug}`);
      return res.status(409).json({ success: false, error: 'Workspace slug is already taken.' });
    }

    const now = new Date();
    const tenantSchemaName = schemaNameFromSlug(draft.workspaceSlug);
    const normalizedAdminPin = normalizePin(adminPin);
    if (adminPin !== undefined && !normalizedAdminPin) {
      return res.status(400).json({ success: false, error: 'Admin PIN must be numeric and 4-8 digits.' });
    }
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${tenantSchemaName}"`);
      const tenant = await tx.tenant.create({
        data: {
          slug: draft.workspaceSlug,
          businessName: draft.businessName,
          businessType: 'retail',
          schemaName: tenantSchemaName,
          status: 'active',
          provisionStatus: 'ready',
          provisionStartedAt: draft.setupStartedAt || now,
          provisionCompletedAt: now,
        },
      });

      await tx.tenantConfig.create({
        data: {
          tenantId: tenant.id,
          industry: draft.industry,
          businessSize: draft.businessSize,
          website: draft.businessWebsite,
          billingPlanInterval: draft.billingPlanInterval || 'monthly',
          businessTypeConfirmed: Boolean(businessTypeConfirmed),
          includeSampleData: Boolean(includeSampleData),
          workspaceInitialized: Boolean(workspaceInitialized),
          modules: modules && typeof modules === 'object' ? modules : undefined,
          termsAcceptedAt: draft.termsAcceptedAt || now,
          emailVerifiedAt: draft.emailVerifiedAt || now,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: draft.adminFirstName || null,
          lastName: draft.adminLastName || null,
          name: `${draft.adminFirstName || ''} ${draft.adminLastName || ''}`.trim(),
          email: draft.adminEmail,
          phone: draft.adminPhoneFull || null,
          passwordHash: draft.passwordHash,
          pin: normalizedAdminPin,
          role: 'admin',
          active: true,
        },
      });

      await tx.onboardingDraft.update({
        where: { id: draft.id },
        data: {
          status: 'completed',
          currentStep: 'completed',
          tenantId: tenant.id,
          createdAdminUserId: user.id,
          setupCompletedAt: now,
          completedAt: now,
          setupProgress: 100,
          status: 'completed',
          currentStep: 'completed',
        },
      });

      return { tenant, user };
    });

    const token = signAccessToken(result.user, result.tenant.id);
    await createAuthSession({ user: result.user, tenantId: result.tenant.id, token });

    return res
      .status(201)
      .cookie(COOKIE_NAME, token, cookieOptions())
      .json({
        success: true,
        message: 'Onboarding completed and workspace provisioned.',
        token,
        tenant: {
          id: result.tenant.id,
          slug: result.tenant.slug,
          status: result.tenant.status,
        },
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          hasPin: Boolean(result.user.pin),
        },
      });
  } catch (error) {
    return next(error);
  }
}

async function updateBusinessType(req, res, next) {
  try {
    const db = req.db || prisma;
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        error: 'Tenant context is required.',
      });
    }
    const {
      businessType,
      businessTypeConfirmed = true,
      workspaceInitialized = true,
      includeSampleData,
      modules,
    } = req.body || {};

    if (!businessType) {
      return res.status(400).json({
        success: false,
        error: 'businessType is required.',
      });
    }

    const [tenant, tenantConfig] = await db.$transaction([
      db.tenant.update({
        where: { id: req.tenant.id },
        data: { businessType: String(businessType).trim().toLowerCase() },
        select: { id: true, slug: true, businessType: true, status: true },
      }),
      db.tenantConfig.upsert({
        where: { tenantId: req.tenant.id },
        create: {
          tenantId: req.tenant.id,
          businessTypeConfirmed: Boolean(businessTypeConfirmed),
          workspaceInitialized: Boolean(workspaceInitialized),
          includeSampleData:
            includeSampleData === undefined ? true : Boolean(includeSampleData),
          modules: modules && typeof modules === 'object' ? modules : undefined,
        },
        update: {
          businessTypeConfirmed: Boolean(businessTypeConfirmed),
          workspaceInitialized: Boolean(workspaceInitialized),
          includeSampleData:
            includeSampleData === undefined ? undefined : Boolean(includeSampleData),
          modules: modules && typeof modules === 'object' ? modules : undefined,
        },
        select: {
          tenantId: true,
          businessTypeConfirmed: true,
          workspaceInitialized: true,
          includeSampleData: true,
          modules: true,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Business type updated successfully.',
      tenant,
      tenantConfig,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createDraft,
  saveStep1,
  saveStep2,
  sendOtp,
  verifyOtp,
  completeOnboarding,
  updateBusinessType,
};

