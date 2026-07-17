const { prisma } = require('../config/db');
const bcrypt = require('bcrypt');

function normalizePin(rawPin) {
  if (rawPin === undefined || rawPin === null) return null;
  const pin = String(rawPin).trim();
  if (!pin) return null;
  if (!/^\d{4,8}$/.test(pin)) return null;
  return pin;
}

const getProfile = async (req, res, next) => {
    try {
    const db = req.db || prisma;
    const user = await db.user.findFirst({
      where: { id: req.user.id, tenantId: req.tenant.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        pin: true,
        createdAt: true,
      },
        });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
    return res.status(200).json({ success: true, data: { ...user, hasPin: Boolean(user.pin), pin: undefined } });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
    try {
    const db = req.db || prisma;
    const { name, firstName, lastName, phone } = req.body;
        const data = {};

        if (name !== undefined && name !== null) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ success: false, error: 'Name is required' });
            }
            data.name = name.trim();
        }
    if (firstName !== undefined) data.firstName = firstName ? String(firstName).trim() : null;
    if (lastName !== undefined) data.lastName = lastName ? String(lastName).trim() : null;
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, error: 'No profile fields to update' });
        }

    const updatedUser = await db.user.update({
            where: { id: req.user.id },
            data,
      select: {
        id: true,
        tenantId: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    return res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
    try {
    const db = req.db || prisma;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Please provide both current and new passwords' });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        }
        
    const user = await db.user.findFirst({
      where: { id: req.user.id, tenantId: req.tenant.id },
    });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || '');
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Incorrect current password' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
            where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
};

// Admin handlers
const getAllUsers = async (req, res, next) => {
    try {
    const db = req.db || prisma;
    const users = await db.user.findMany({
      where: { tenantId: req.tenant.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        registerId: true,
        lastLogin: true,
        pin: true,
        createdAt: true,
        userBranches: {
          select: {
            branchId: true,
            branch: {
              select: { tenantId: true },
            },
          },
        },
      },
    });
    const shaped = users.map((user) => ({
      ...user,
      branchIds: user.userBranches
        .filter((entry) => entry.branch?.tenantId === req.tenant.id)
        .map((entry) => entry.branchId),
      hasPin: Boolean(user.pin),
      pin: undefined,
      userBranches: undefined,
    }));
    return res.status(200).json({ success: true, count: shaped.length, data: shaped });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
    try {
    const db = req.db || prisma;
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
    }
    const target = await db.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found in tenant scope' });
    }
    await db.user.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, email, password, role = 'cashier', phone = null, pin } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role || 'cashier').toLowerCase();
    const allowedRoles = ['cashier', 'manager', 'admin', 'superadmin'];
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role selected' });
    }
    if (normalizedRole === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Only superadmin can create superadmin users' });
    }
    const normalizedPin = normalizePin(pin);
    if (pin !== undefined && !normalizedPin) {
      return res.status(400).json({ success: false, error: 'PIN must be numeric and 4-8 digits' });
    }
    if (normalizedPin) {
      const pinExists = await db.user.findFirst({
        where: { tenantId: req.tenant.id, pin: normalizedPin },
        select: { id: true },
      });
      if (pinExists) {
        return res.status(409).json({ success: false, error: 'PIN is already in use in this workspace' });
      }
    }

    const existing = await db.user.findFirst({
      where: { tenantId: req.tenant.id, email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'User already exists for this tenant' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const created = await db.user.create({
      data: {
        tenantId: req.tenant.id,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        passwordHash,
        role: normalizedRole,
        active: true,
        pin: normalizedPin,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        registerId: true,
        lastLogin: true,
        pin: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: { ...created, branchIds: [], hasPin: Boolean(created.pin), pin: undefined },
    });
  } catch (error) {
    return next(error);
  }
};

const updateUserAdmin = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { id } = req.params;
    const { role, active, phone, registerId, pin } = req.body || {};

    const target = await db.user.findFirst({
      where: { id, tenantId: req.tenant.id },
      select: { id: true, role: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found in tenant scope' });
    }
    if (id === req.user.id && active === false) {
      return res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
    }

    const data = {};
    if (role !== undefined) {
      const normalizedRole = String(role).toLowerCase();
      const allowedRoles = ['cashier', 'manager', 'admin', 'superadmin'];
      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({ success: false, error: 'Invalid role selected' });
      }
      if (normalizedRole === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Only superadmin can assign superadmin role' });
      }
      if (target.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Only superadmin can modify superadmin users' });
      }
      data.role = normalizedRole;
    }
    if (active !== undefined) data.active = Boolean(active);
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (registerId !== undefined) data.registerId = registerId || null;
    if (pin !== undefined) {
      const targetRoleForPin = data.role || target.role;
      const canManageTargetPin =
        ['cashier', 'manager'].includes(targetRoleForPin) || req.user.role === 'superadmin';
      if (!canManageTargetPin) {
        return res.status(403).json({
          success: false,
          error: 'PIN can only be managed for cashier or manager accounts',
        });
      }
      const normalizedPin = normalizePin(pin);
      if (pin !== null && pin !== '' && !normalizedPin) {
        return res.status(400).json({ success: false, error: 'PIN must be numeric and 4-8 digits' });
      }
      if (normalizedPin) {
        const pinExists = await db.user.findFirst({
          where: { tenantId: req.tenant.id, pin: normalizedPin, NOT: { id } },
          select: { id: true },
        });
        if (pinExists) {
          return res.status(409).json({ success: false, error: 'PIN is already in use in this workspace' });
        }
      }
      data.pin = normalizedPin;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        registerId: true,
        lastLogin: true,
        pin: true,
        createdAt: true,
      },
    });
    return res.status(200).json({ success: true, data: { ...updated, hasPin: Boolean(updated.pin), pin: undefined } });
  } catch (error) {
    return next(error);
  }
};

const setMyPin = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const normalizedPin = normalizePin(req.body?.pin);
    if (!normalizedPin) {
      return res.status(400).json({ success: false, error: 'PIN must be numeric and 4-8 digits' });
    }
    const pinExists = await db.user.findFirst({
      where: { tenantId: req.tenant.id, pin: normalizedPin, NOT: { id: req.user.id } },
      select: { id: true },
    });
    if (pinExists) {
      return res.status(409).json({ success: false, error: 'PIN is already in use in this workspace' });
    }
    await db.user.update({
      where: { id: req.user.id },
      data: { pin: normalizedPin },
    });
    return res.status(200).json({ success: true, message: 'PIN saved successfully', data: { hasPin: true } });
  } catch (error) {
    return next(error);
  }
};

// Offline credential mirror for the desktop app: bcrypt hashes of manager+
// PINs so manager overrides keep working while the till is offline. PINs are
// hashed here on the way out — plaintext never leaves the server.
const MANAGER_ROLES = ['manager', 'admin', 'superadmin'];

const getOfflineCredentials = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const users = await db.user.findMany({
      where: {
        tenantId: req.tenant.id,
        active: true,
        role: { in: MANAGER_ROLES },
        NOT: { pin: null },
      },
      select: { id: true, name: true, role: true, pin: true },
    });
    const data = await Promise.all(
      users
        .filter((u) => String(u.pin ?? '').trim())
        .map(async (u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          pinHash: await bcrypt.hash(String(u.pin), 8),
        })),
    );
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return next(error);
  }
};

// --- fingerprint templates (DigitalPersona; matched locally on the till) ---

const listFingerprintTemplates = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const templates = await db.fingerprintTemplate.findMany({
      where: { tenantId: req.tenant.id, user: { active: true } },
      select: {
        userId: true,
        finger: true,
        template: true,
        user: { select: { name: true, role: true } },
      },
    });
    const data = templates.map((t) => ({
      userId: t.userId,
      name: t.user.name,
      role: t.user.role,
      finger: t.finger,
      template: t.template,
    }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return next(error);
  }
};

const enrollFingerprint = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { userId, finger = 0, template } = req.body || {};
    if (!template || typeof template !== 'string') {
      return res.status(400).json({ success: false, error: 'template (base64) is required' });
    }
    const fingerIndex = Number(finger);
    if (!Number.isInteger(fingerIndex) || fingerIndex < 0 || fingerIndex > 9) {
      return res.status(400).json({ success: false, error: 'finger must be an integer 0-9' });
    }
    const targetUserId = userId ? String(userId) : req.user.id;
    if (targetUserId !== req.user.id && !MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only managers or admins can enroll fingerprints for other users',
      });
    }
    const target = await db.user.findFirst({
      where: { id: targetUserId, tenantId: req.tenant.id, active: true },
      select: { id: true },
    });
    if (!target) {
      return res.status(400).json({ success: false, error: 'User not found for this tenant' });
    }
    const saved = await db.fingerprintTemplate.upsert({
      where: {
        tenantId_userId_finger: {
          tenantId: req.tenant.id,
          userId: targetUserId,
          finger: fingerIndex,
        },
      },
      create: {
        tenantId: req.tenant.id,
        userId: targetUserId,
        finger: fingerIndex,
        template,
      },
      update: { template },
    });
    return res.status(201).json({
      success: true,
      data: { id: saved.id, userId: saved.userId, finger: saved.finger },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteFingerprintTemplates = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const result = await db.fingerprintTemplate.deleteMany({
      where: { tenantId: req.tenant.id, userId: String(req.params.userId) },
    });
    return res.status(200).json({ success: true, count: result.count });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  deleteUser,
  createUser,
  updateUserAdmin,
  setMyPin,
  getOfflineCredentials,
  listFingerprintTemplates,
  enrollFingerprint,
  deleteFingerprintTemplates,
};
