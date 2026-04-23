const SENSITIVE_KEYS = new Set([
  'password',
  'adminPassword',
  'passwordHash',
  'verificationCode',
  'code',
  'token',
]);

function sanitizePayload(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (typeof value !== 'object') return value;

  return Object.entries(value).reduce((acc, [key, raw]) => {
    if (SENSITIVE_KEYS.has(key)) {
      acc[key] = '[REDACTED]';
      return acc;
    }
    acc[key] = sanitizePayload(raw);
    return acc;
  }, {});
}

function onboardingLogger(req, res, next) {
  const startedAt = Date.now();
  const safeBody = sanitizePayload(req.body || {});
  const requestId = req.requestId || 'n/a';

  console.log(
    `[onboarding] -> ${req.method} ${req.originalUrl} requestId=${requestId} body=${JSON.stringify(safeBody)}`,
  );

  res.on('finish', () => {
    const elapsed = Date.now() - startedAt;
    console.log(
      `[onboarding] <- ${req.method} ${req.originalUrl} requestId=${requestId} status=${res.statusCode} durationMs=${elapsed}`,
    );
  });

  next();
}

module.exports = onboardingLogger;

