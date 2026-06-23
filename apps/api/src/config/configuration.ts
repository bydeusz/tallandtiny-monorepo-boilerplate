export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL ?? '60000', 10),
  },
  cors: {
    origins:
      process.env.CORS_ORIGIN === '*'
        ? '*'
        : (process.env.CORS_ORIGIN ?? '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    methods: process.env.CORS_METHODS ?? 'GET,HEAD,PUT,PATCH,POST,DELETE',
    maxAge: parseInt(process.env.CORS_MAX_AGE ?? '3600', 10),
  },
  log: {
    level:
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
  },
  shutdown: {
    forceExitTimeoutMs: parseInt(
      process.env.SHUTDOWN_FORCE_EXIT_TIMEOUT_MS ?? '15000',
      10,
    ),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION ?? '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
  },
  auth: {
    allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS ?? '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    registrationEnabled: process.env.REGISTRATION_ENABLED === 'true',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
  mail: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.MAIL_FROM ?? 'noreply@example.com',
    supportEmail: process.env.SUPPORT_EMAIL ?? 'support@example.com',
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET ?? 'uploads',
  },
});
