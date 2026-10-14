import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildApp } from '../../src/app.js'

const tempDirs = []
process.on('exit', () => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true })
})

export function testConfig(overrides = {}) {
  const dataDir = overrides.dataDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-test-'))
  if (!overrides.dataDir) tempDirs.push(dataDir)

  return {
    env: 'test',
    isProd: false,
    host: '127.0.0.1',
    port: 0,
    publicUrl: 'https://yaqin.test',
    dataDir,
    dbFile: ':memory:',
    uploadsDir: path.join(dataDir, 'uploads'),
    backupsDir: path.join(dataDir, 'backups'),
    sessionSecret: 'test-secret-0123456789abcdef0123456789',
    adminLogin: 'admin',
    adminPassword: 'secret-pass-1',
    trustProxy: false,
    logger: false,
    ...overrides
  }
}

export const makeApp = (overrides = {}) => buildApp(testConfig(overrides))
