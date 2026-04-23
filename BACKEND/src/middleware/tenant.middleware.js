const { prisma } = require('../config/db');

function firstHostPart(host) {
  if (!host) return null;
  const clean = String(host).split(':')[0].toLowerCase();
  if (!clean || clean === 'localhost' || clean === '127.0.0.1') return null;
  const parts = clean.split('.');
  if (parts.length < 2) return null;
  if (parts[0] === 'www') return null;
  return parts[0];
}

function normalizeSlug(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const slug = raw.trim().toLowerCase();
  if (!slug) return null;
  return slug;
}

function tenantResolver(options = {}) {
  const { required = false } = options;
  return async (req, res, next) => {
    try {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const subSlug = firstHostPart(host);
      const bodySlug = normalizeSlug(req.body?.workspaceSlug || req.body?.slug);
      const querySlug = normalizeSlug(req.query?.workspaceSlug || req.query?.slug || req.query?.workspace);
      const slug = subSlug || bodySlug || querySlug;

      if (!slug) {
        req.tenant = null;
        if (required) {
          return res.status(400).json({
            success: false,
            error: 'Workspace slug is required to resolve tenant.',
          });
        }
        return next();
      }

      let tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          businessName: true,
          businessType: true,
          schemaName: true,
          status: true,
          provisionStatus: true,
        },
      });

      if (!tenant && host) {
        const domain = String(host).split(':')[0].toLowerCase();
        const mapped = await prisma.tenantDomain.findUnique({
          where: { domain },
          select: {
            tenant: {
              select: {
                id: true,
                slug: true,
                businessName: true,
                businessType: true,
                schemaName: true,
                status: true,
                provisionStatus: true,
              },
            },
          },
        });
        tenant = mapped?.tenant || null;
      }

      if (!tenant) {
        req.tenant = null;
        if (required) {
          return res.status(404).json({
            success: false,
            error: 'Tenant not found for this workspace.',
          });
        }
        return next();
      }

      if (tenant.status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'Tenant is suspended.',
        });
      }

      req.tenant = tenant;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = tenantResolver;

