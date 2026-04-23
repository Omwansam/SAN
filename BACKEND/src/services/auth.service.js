const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const config = require('../config/env');

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function jwtExpiresToMs(value) {
  const s = String(value || '').trim();
  const m = /^(\d+)(s|m|h|d)$/i.exec(s);
  if (!m) return 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return n * mult[u];
}

function signAccessToken(user, tenantId) {
  return jwt.sign(
    {
      sub: user.id,
      tid: tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN || '1d' },
  );
}

async function createAuthSession({ user, tenantId, token }) {
  const tokenHash = hashValue(token);
  const expiresAt = new Date(Date.now() + jwtExpiresToMs(config.JWT_EXPIRES_IN || '1d'));
  await prisma.authSession.create({
    data: {
      tenantId,
      userId: user.id,
      tokenHash,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      expiresAt,
    },
  });
}

async function revokeAuthSessionByToken(token) {
  const tokenHash = hashValue(token);
  await prisma.authSession.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  hashValue,
  signAccessToken,
  createAuthSession,
  revokeAuthSessionByToken,
  jwtExpiresToMs,
};

