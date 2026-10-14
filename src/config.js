import path from 'node:path'

const DEV_SECRET = 'dev-only-secret-change-me-0123456789'

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'
  const isProd = nodeEnv === 'production'

  if (isProd && !env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required when NODE_ENV=production')
  }

  const dataDir = path.resolve(env.DATA_DIR || './data')

  return {
    env: nodeEnv,
    isProd,
    host: env.HOST || '0.0.0.0',
    port: Number(env.PORT) || 3000,
    publicUrl: (env.PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    dataDir,
    dbFile: path.join(dataDir, 'yaqin.db'),
    uploadsDir: path.join(dataDir, 'uploads'),
    backupsDir: path.join(dataDir, 'backups'),
    sessionSecret: env.SESSION_SECRET || DEV_SECRET,
    adminLogin: env.ADMIN_LOGIN || null,
    adminPassword: env.ADMIN_PASSWORD || null,
    trustProxy: env.TRUST_PROXY === 'true',
    logger: nodeEnv !== 'test',
  }
}
