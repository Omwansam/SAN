const { prisma } = require('../config/db');

function branchScope(options = {}) {
  const {
    required = false,
    allowRoles = ['superadmin', 'admin'],
    paramKey = 'branchId',
    headerKey = 'x-branch-id',
    queryKey = 'branchId',
    bodyKey = 'branchId',
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.tenant?.id || !req.user?.id) return next();
      const db = req.db || prisma;

      const requestedBranchId =
        req.headers[headerKey] ||
        req.query?.[queryKey] ||
        req.body?.[bodyKey] ||
        req.params?.[paramKey] ||
        null;

      let branchId = requestedBranchId;
      if (!branchId) {
        const runtime = await db.tenantRuntimeState.findUnique({
          where: { tenantId: req.tenant.id },
          select: { activeBranchId: true },
        });
        branchId = runtime?.activeBranchId || null;
      }

      if (!branchId) {
        if (required) {
          return res.status(400).json({
            success: false,
            error: 'Branch scope is required.',
          });
        }
        req.branchId = null;
        return next();
      }

      const branch = await db.branch.findFirst({
        where: { id: branchId, tenantId: req.tenant.id },
        select: { id: true },
      });
      if (!branch) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found in tenant scope.',
        });
      }

      if (allowRoles.includes(req.user.role)) {
        req.branchId = branchId;
        return next();
      }

      const userBranches = await db.userBranch.findMany({
        where: { userId: req.user.id, branch: { tenantId: req.tenant.id } },
        select: { branchId: true },
      });
      const restricted = userBranches.length > 0;
      if (restricted && !userBranches.some((b) => b.branchId === branchId)) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this branch.',
        });
      }

      req.branchId = branchId;
      return next();
    } catch (error) {
      console.error(`[RequestId: ${req.requestId || 'n/a'}] Branch Scope Error:`, error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during branch scope validation.',
      });
    }
  };
}

const branchScopeMiddleware = (req, res, next) => branchScope({ required: true })(req, res, next);

const rbacMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, error: 'Forbidden: Missing user role context' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient role permissions' });
    }

    return next();
  };
};

module.exports = branchScope;
module.exports.branchScope = branchScope;
module.exports.branchScopeMiddleware = branchScopeMiddleware;
module.exports.rbacMiddleware = rbacMiddleware;

