require('dotenv').config()

module.exports = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  ETIMS_SYNC_ENABLED: process.env.ETIMS_SYNC_ENABLED || 'true',
  ETIMS_WORKER_INTERVAL_MS: process.env.ETIMS_WORKER_INTERVAL_MS || '8000',
  ETIMS_DEFAULT_READINESS_MODE: process.env.ETIMS_DEFAULT_READINESS_MODE || 'true',
};