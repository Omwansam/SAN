const bcrypt = require('bcrypt');
const config = require('../config/env');
const { prisma } = require('../config/db');
const {
  signAccessToken,
  createAuthSession,
  revokeAuthSessionByToken,
  jwtExpiresToMs,
} = require('../services/auth.service');

const COOKIE_NAME = 'token';

function normalizePin(rawPin) {
  if (rawPin === undefined || rawPin === null) return null;
  const pin = String(rawPin).trim();
  if (!pin) return null;
  if (!/^\d{4,8}$/.test(pin)) return null;
  return pin;
}

function cookieOptions() {
  return {
    maxAge: jwtExpiresToMs(config.JWT_EXPIRES_IN || '1d'),
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
  };
}

function presentAuthPayload(user, tenant) {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasPin: Boolean(user.pin),
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      businessName: tenant.businessName || null,
      businessType: tenant.businessType || null,
      status: tenant.status,
    },
  };
}

async function readTenantConfig(db, tenantId) {
  return db.tenantConfig.findUnique({
    where: { tenantId },
    select: {
      businessTypeConfirmed: true,
      workspaceInitialized: true,
      includeSampleData: true,
      modules: true,
    },
  });
}

async function issueAuthResponse({ db, res, user, tenant, statusCode = 200, message = 'Authenticated' }) {
  const token = signAccessToken(user, tenant.id);
  await createAuthSession({ user, tenantId: tenant.id, token });
  const tenantConfig = await readTenantConfig(db, tenant.id);
  return res
    .status(statusCode)
    .cookie(COOKIE_NAME, token, cookieOptions())
    .json({
      success: true,
      token,
      message,
      ...presentAuthPayload(user, tenant),
      tenantConfig: tenantConfig || null,
    });
}

async function registerUser(req, res, next) {
  try {
    const db = req.db || prisma;
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        error: 'Tenant context is required. Provide workspaceSlug or subdomain.',
      });
    }

    const { name, email, password, role = 'cashier', phone = null, pin } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and password are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db.user.findFirst({
      where: { tenantId: req.tenant.id, email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'User already exists for this tenant',
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const requestedRole = String(role || 'cashier').toLowerCase();
    const safeRole = requestedRole === 'manager' ? 'manager' : 'cashier';
    const normalizedPin = normalizePin(pin);
    if (pin !== undefined && !normalizedPin) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be numeric and 4-8 digits.',
      });
    }
    if (normalizedPin) {
      const pinExists = await db.user.findFirst({
        where: { tenantId: req.tenant.id, pin: normalizedPin },
        select: { id: true },
      });
      if (pinExists) {
        return res.status(409).json({
          success: false,
          error: 'PIN is already in use by another user in this workspace.',
        });
      }
    }

    const user = await db.user.create({
      data: {
        tenantId: req.tenant.id,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        passwordHash,
        role: safeRole,
        pin: normalizedPin,
      },
    });

    return issueAuthResponse({
      db,
      res,
      user,
      tenant: req.tenant,
      statusCode: 201,
      message: 'User registered successfully',
    });
  } catch (error) {
    return next(error);
  }
}

async function registerAdmin(req, res, next) {
  try {
    const db = req.db || prisma;
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        error: 'Tenant context is required.',
      });
    }

    const { name, email, password, phone = null, pin } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and password are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await db.user.findFirst({
      where: { tenantId: req.tenant.id, email: normalizedEmail },
      select: { id: true },
    });
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'User already exists for this tenant',
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const normalizedPin = normalizePin(pin);
    if (pin !== undefined && !normalizedPin) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be numeric and 4-8 digits.',
      });
    }
    if (normalizedPin) {
      const pinExists = await db.user.findFirst({
        where: { tenantId: req.tenant.id, pin: normalizedPin },
        select: { id: true },
      });
      if (pinExists) {
        return res.status(409).json({
          success: false,
          error: 'PIN is already in use by another user in this workspace.',
        });
      }
    }
    const user = await db.user.create({
      data: {
        tenantId: req.tenant.id,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        passwordHash,
        role: 'admin',
        pin: normalizedPin,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function loginUser(req, res, next) {
  try {
    const db = req.db || prisma;
    const tenant = req.tenant;
    if (!tenant?.id) {
      return res.status(400).json({
        success: false,
        error: 'workspaceSlug or valid tenant subdomain is required.',
      });
    }

    const { username, email, password, pin, mode } = req.body;
    const identifier = String(username || email || '').trim().toLowerCase();

    let user = null;
    const pinMode = mode === 'pin' || Boolean(pin);
    if (pinMode) {
      const normalizedPin = normalizePin(pin);
      if (!normalizedPin) {
        return res.status(400).json({
          success: false,
          error: 'PIN must be numeric and 4-8 digits.',
        });
      }
      user = await db.user.findFirst({
        where: {
          tenantId: tenant.id,
          pin: normalizedPin,
          active: true,
        },
      });
    } else {
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'username/email and password are required.',
        });
      }
      user = await db.user.findFirst({
        where: {
          tenantId: tenant.id,
          active: true,
          OR: [{ email: identifier }, { name: identifier }],
        },
      });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }
      const validPassword = await bcrypt.compare(String(password), user.passwordHash || '');
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return issueAuthResponse({
      db,
      res,
      user,
      tenant,
      statusCode: 200,
      message: 'User logged in successfully',
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const db = req.db || prisma;
    if (!req.user || !req.tenant) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }
    const configRow = await db.tenantConfig.findUnique({
      where: { tenantId: req.tenant.id },
      select: {
        businessTypeConfirmed: true,
        workspaceInitialized: true,
        includeSampleData: true,
      },
    });
    return res.status(200).json({
      success: true,
      ...presentAuthPayload(req.user, req.tenant),
      tenantConfig: configRow || null,
    });
  } catch (error) {
    return next(error);
  }
}

async function logoutUser(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    if (token) await revokeAuthSessionByToken(token);

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
    });
    return res.status(200).json({
      success: true,
      message: 'User logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    const db = req.db || prisma;
    if (!req.user || !req.tenant) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }
    return issueAuthResponse({
      db,
      res,
      user: req.user,
      tenant: req.tenant,
      statusCode: 200,
      message: 'Session refreshed',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerUser,
  registerAdmin,
  loginUser,
  logoutUser,
  getMe,
  refreshToken,
};