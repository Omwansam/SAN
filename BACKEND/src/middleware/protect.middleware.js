const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { prisma } = require('../config/db');
const { hashValue } = require('../services/auth.service');

const protect = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided',
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const tokenTenantId = decoded.tid;
    const tokenUserId = decoded.sub;

    if (!tokenTenantId || !tokenUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token payload',
      });
    }

    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context is required before authentication',
      });
    }

    if (req.tenant.id !== tokenTenantId) {
      return res.status(403).json({
        success: false,
        message: 'Token tenant mismatch',
      });
    }

    const session = await db.authSession.findFirst({
      where: {
        tokenHash: hashValue(token),
        tenantId: tokenTenantId,
        userId: tokenUserId,
        revokedAt: null,
      },
      select: { id: true, expiresAt: true },
    });

    if (!session || (session.expiresAt && session.expiresAt.getTime() < Date.now())) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Session expired or revoked',
      });
    }

    const user = await db.user.findFirst({
      where: {
        id: tokenUserId,
        tenantId: tokenTenantId,
        active: true,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        pin: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not found',
      });
    }

    req.user = user;
    req.auth = { token, sessionId: session.id, claims: decoded };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token expired. Please log in again',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token',
      });
    }
    return next(error);
  }
};

module.exports = protect;