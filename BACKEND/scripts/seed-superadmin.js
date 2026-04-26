require('dotenv').config();

const bcrypt = require('bcrypt');
const { connectDB, disconnectDB, prisma } = require('../src/config/db');

function required(name, fallback = null) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

async function seed() {
  const slug = normalizeSlug(required('SEED_WORKSPACE_SLUG', 'acme'));
  const businessName = required('SEED_BUSINESS_NAME', 'Acme Demo Store');
  const businessType = required('SEED_BUSINESS_TYPE', 'retail');
  const name = required('SEED_SUPERADMIN_NAME', 'Developer Superadmin');
  const email = required('SEED_SUPERADMIN_EMAIL', 'superadmin@sanpos.dev').toLowerCase();
  const password = required('SEED_SUPERADMIN_PASSWORD', 'SuperAdmin#2026!');
  const pin = required('SEED_SUPERADMIN_PIN', '909090');
  const allowUpdate = process.env.SEED_ALLOW_UPDATE === 'true';

  if (!/^[a-z0-9][a-z0-9-]{1,49}$/.test(slug)) {
    throw new Error('SEED_WORKSPACE_SLUG must be 2-50 chars: lowercase letters, numbers, hyphens.');
  }
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('SEED_SUPERADMIN_PIN must be numeric and 4-8 digits.');
  }
  if (password.length < 6) {
    throw new Error('SEED_SUPERADMIN_PASSWORD must be at least 6 characters.');
  }

  await connectDB();

  try {
    const tenant = await prisma.tenant.upsert({
      where: { slug },
      update: {
        businessName,
        businessType,
      },
      create: {
        slug,
        businessName,
        businessType,
      },
    });

    await prisma.tenantConfig.upsert({
      where: { tenantId: tenant.id },
      update: {
        businessTypeConfirmed: true,
        workspaceInitialized: true,
      },
      create: {
        tenantId: tenant.id,
        businessTypeConfirmed: true,
        workspaceInitialized: true,
      },
    });

    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (existingUser && !allowUpdate) {
      console.log('[seed:superadmin] Superadmin already exists. Skipping update.');
      console.log('[seed:superadmin] To force password/pin update, run with SEED_ALLOW_UPDATE=true.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
      update: {
        name,
        passwordHash,
        role: 'superadmin',
        pin,
        active: true,
      },
      create: {
        tenantId: tenant.id,
        name,
        email,
        passwordHash,
        role: 'superadmin',
        pin,
        active: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log('[seed:superadmin] Done.');
    console.log(`[seed:superadmin] Workspace slug: ${slug}`);
    console.log(`[seed:superadmin] Superadmin: ${user.email} (${user.role})`);
  } finally {
    await disconnectDB();
  }
}

seed().catch(async (error) => {
  console.error('[seed:superadmin] Failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
