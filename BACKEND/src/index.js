const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const requestId = require('./middleware/request-id.middleware');
const tenantResolver = require('./middleware/tenant.middleware');
const tenantDbContext = require('./middleware/tenant-db.middleware');
const errorHandler = require('./middleware/error.middleware');
const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const onboardingRouter = require('./routes/onboarding.routes');
const branchRouter = require('./routes/branches.routes');
const categoryRouter = require('./routes/categories.routes');
const productRouter = require('./routes/products.routes');
const customerRouter = require('./routes/customers.routes');
const stockRouter = require('./routes/stock.routes');
const inventoryRouter = require('./routes/inventory.routes');
const taxRateRouter = require('./routes/taxrates.routes');
const supplierRouter = require('./routes/suppliers.routes');
const shiftRouter = require('./routes/shifts.routes');
const reportRouter = require('./routes/reports.routes');
const orderRouter = require('./routes/orders.routes');
const discountRouter = require('./routes/discounts.routes');
const etimsRouter = require('./routes/etims.routes');
const { processPendingFiscalJobs } = require('./services/etims.service');

const app = express();
const port = config.PORT || 5000;
let httpServer = null;
let etimsWorker = null;

app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL || true,
    credentials: true,
  }),
);
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestId);
app.use(tenantResolver({ required: false }));
app.use(tenantDbContext);

app.get('/', (req, res) => {
  return res.json({
    success: true,
    message: 'Hello from the backend',
    requestId: req.requestId,
    tenant: req.tenant
      ? {
          id: req.tenant.id,
          slug: req.tenant.slug,
          status: req.tenant.status,
        }
      : null,
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/branches', branchRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/customers', customerRouter);
app.use('/api/stock', stockRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/taxrates', taxRateRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/shifts', shiftRouter);
app.use('/api/reports', reportRouter);
app.use('/api/orders', orderRouter);
app.use('/api/discounts', discountRouter);
app.use('/api/etims', etimsRouter);

app.use(errorHandler);

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  if (etimsWorker) {
    clearInterval(etimsWorker);
    etimsWorker = null;
  }
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await disconnectDB();
}

function maybeStartEtimsWorker() {
  const enabled = String(config.ETIMS_SYNC_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) {
    console.log('[etims] worker disabled by config');
    return;
  }
  const intervalMs = Math.max(Number(config.ETIMS_WORKER_INTERVAL_MS) || 8000, 1000);
  etimsWorker = setInterval(async () => {
    try {
      const result = await processPendingFiscalJobs({ limit: 20 });
      if (result.processed > 0) {
        console.log(
          `[etims] processed=${result.processed}, success=${result.success}, failed=${result.failed}`,
        );
      }
    } catch (error) {
      console.error('[etims] worker iteration failed:', error.message);
    }
  }, intervalMs);
  console.log(`[etims] worker started (interval: ${intervalMs}ms)`);
}

async function bootstrap() {
  await connectDB();
  maybeStartEtimsWorker();
  httpServer = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
  httpServer.on('error', (error) => {
    console.error('[server] HTTP server error:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error(`[server] Port ${port} is already in use. Stop the other process and restart.`);
      process.exit(1);
    }
  });
}

process.on('SIGINT', async () => {
  await shutdown('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown('SIGTERM');
  process.exit(0);
});

bootstrap().catch(async (error) => {
  console.error('[server] bootstrap failed:', error.message);
  await disconnectDB();
  process.exit(1);
});
