const { prisma } = require('../config/db');

const isPrivilegedRole = (role) => ['superadmin', 'admin', 'manager'].includes(role);

const listBranches = async (req, res, next) => {
  try {
    const db = req.db || prisma;

    if (isPrivilegedRole(req.user.role)) {
      const branches = await db.branch.findMany({
        where: { tenantId: req.tenant.id },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json({ success: true, count: branches.length, data: branches });
    }

    const userBranches = await db.userBranch.findMany({
      where: { userId: req.user.id, branch: { tenantId: req.tenant.id } },
      select: { branch: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: userBranches.length,
      data: userBranches.map((item) => item.branch),
    });
  } catch (error) {
    return next(error);
  }
};

const getBranchById = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const branch = await db.branch.findFirst({
      where: { id: req.branchId, tenantId: req.tenant.id },
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    return res.status(200).json({ success: true, data: branch });
  } catch (error) {
    return next(error);
  }
};

const createBranch = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, address } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Branch name is required' });
    }

    const normalizedName = name.trim();
    const existing = await db.branch.findFirst({
      where: { tenantId: req.tenant.id, name: normalizedName },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A branch with this name already exists' });
    }

    const branch = await db.branch.create({
      data: {
        tenantId: req.tenant.id,
        name: normalizedName,
        address: address ? String(address).trim() : null,
      },
    });

    return res.status(201).json({ success: true, data: branch });
  } catch (error) {
    return next(error);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { name, address } = req.body;

    if (name === undefined && address === undefined) {
      return res.status(400).json({ success: false, error: 'No branch fields to update' });
    }

    const current = await db.branch.findFirst({
      where: { id: req.branchId, tenantId: req.tenant.id },
      select: { id: true, name: true },
    });
    if (!current) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    const data = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Branch name must be a non-empty string' });
      }
      const normalizedName = name.trim();
      if (normalizedName !== current.name) {
        const duplicate = await db.branch.findFirst({
          where: { tenantId: req.tenant.id, name: normalizedName, NOT: { id: current.id } },
          select: { id: true },
        });
        if (duplicate) {
          return res.status(409).json({ success: false, error: 'Another branch with this name already exists' });
        }
      }
      data.name = normalizedName;
    }

    if (address !== undefined) {
      data.address = address ? String(address).trim() : null;
    }

    const updated = await db.branch.update({
      where: { id: req.branchId },
      data,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
};

const deleteBranch = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const branch = await db.branch.findFirst({
      where: { id: req.branchId, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    await db.branch.delete({ where: { id: req.branchId } });
    return res.status(200).json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete branch with dependent records. Reassign data first.',
      });
    }
    return next(error);
  }
};

const listBranchUsers = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const branch = await db.branch.findFirst({
      where: { id: req.branchId, tenantId: req.tenant.id },
      select: { id: true, name: true },
    });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    const assignments = await db.userBranch.findMany({
      where: { branchId: req.branchId, user: { tenantId: req.tenant.id } },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            active: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        branch,
        users: assignments.map((item) => ({
          ...item.user,
          assignedAt: item.createdAt,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const assignUserToBranch = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { branchId, userId } = req.params;

    const [branch, user] = await Promise.all([
      db.branch.findFirst({
        where: { id: branchId, tenantId: req.tenant.id },
        select: { id: true, name: true },
      }),
      db.user.findFirst({
        where: { id: userId, tenantId: req.tenant.id },
        select: { id: true, name: true, email: true, role: true, active: true },
      }),
    ]);

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in tenant scope' });
    }
    if (!user.active) {
      return res.status(400).json({ success: false, error: 'Cannot assign an inactive user to a branch' });
    }

    const assignment = await db.userBranch.upsert({
      where: { userId_branchId: { userId, branchId } },
      update: {},
      create: { userId, branchId },
      select: { userId: true, branchId: true, createdAt: true },
    });

    return res.status(200).json({
      success: true,
      message: 'User assigned to branch successfully',
      data: assignment,
    });
  } catch (error) {
    return next(error);
  }
};

const removeUserFromBranch = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { branchId, userId } = req.params;

    const branch = await db.branch.findFirst({
      where: { id: branchId, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    const assignment = await db.userBranch.findUnique({
      where: { userId_branchId: { userId, branchId } },
      select: { userId: true, branchId: true },
    });
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'User is not assigned to this branch' });
    }

    await db.userBranch.delete({
      where: { userId_branchId: { userId, branchId } },
    });

    return res.status(200).json({
      success: true,
      message: 'User removed from branch successfully',
      data: assignment,
    });
  } catch (error) {
    return next(error);
  }
};

const setUserBranchAccess = async (req, res, next) => {
  try {
    const db = req.db || prisma;
    const { userId } = req.params;
    const { branchIds } = req.body || {};

    if (!Array.isArray(branchIds)) {
      return res.status(400).json({ success: false, error: 'branchIds must be an array' });
    }

    const uniqueBranchIds = [...new Set(branchIds.filter((id) => typeof id === 'string' && id.trim()))];

    const user = await db.user.findFirst({
      where: { id: userId, tenantId: req.tenant.id },
      select: { id: true, active: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in tenant scope' });
    }
    if (!user.active) {
      return res.status(400).json({ success: false, error: 'Cannot change branch access for an inactive user' });
    }

    if (uniqueBranchIds.length > 0) {
      const allowedBranches = await db.branch.findMany({
        where: {
          tenantId: req.tenant.id,
          id: { in: uniqueBranchIds },
        },
        select: { id: true },
      });
      if (allowedBranches.length !== uniqueBranchIds.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more branchIds are invalid for this tenant',
        });
      }
    }

    await db.$transaction(async (tx) => {
      await tx.userBranch.deleteMany({ where: { userId } });
      if (uniqueBranchIds.length > 0) {
        await tx.userBranch.createMany({
          data: uniqueBranchIds.map((branchId) => ({ userId, branchId })),
          skipDuplicates: true,
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'User branch access updated',
      data: {
        userId,
        branchIds: uniqueBranchIds,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  listBranchUsers,
  assignUserToBranch,
  removeUserFromBranch,
  setUserBranchAccess,
};
