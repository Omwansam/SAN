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

const app = express();
const port = config.PORT || 5000;
let httpServer = null;

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

app.use(errorHandler);

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await disconnectDB();
}

async function bootstrap() {
  await connectDB();
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
