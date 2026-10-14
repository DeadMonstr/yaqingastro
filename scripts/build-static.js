// Статическая копия публичных страниц для демо на GitHub Pages: без кабинета, базы и загрузки фото.
// Тексты — значения по умолчанию, меню — начальное из seed.
// Запуск: PUBLIC_URL=https://user.github.io/repo npm run build:static [-- папка]  (по умолчанию dist/)
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildApp } from '../src/app.js'
import { DEFAULT_LANG, LANGS } from '../src/services/i18n.js'

const ROOT = path.join(import.meta.dirname, '..')
const NOINDEX = '<meta name="robots" content="noindex">'

// Проект на Pages живёт в /<repo>/: ссылки от корня («/static/…», «/ru/menu») получают этот префикс.
export function rebase(text, base) {
  return text
    .replace(/(\s[\w:-]+=")\/(?!\/)/g, `$1${base}/`)
    .replace(/srcset="[^"]*"/g, attr => attr.replace(/(,\s*)\/(?!\/)/g, `$1${base}/`))
    .replace(/url\((['"]?)\/(?!\/)/g, `url($1${base}/`)
}

// Файлы, на которые ссылается текст: «/repo/static/css/site.css?v=1» → «/static/css/site.css».
function assetPaths(text, base) {
  const prefix = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${prefix}(/(?:static|uploads)/[^"'\\s),?#]+)`, 'g')
  return [...text.matchAll(re)].map(m => m[1])
}

// Страница-переход для адресов без языка: на сервере это 302 на язык из cookie или русский.
const redirectPage = target => '<!doctype html>\n<html><head><meta charset="utf-8">'
  + `${NOINDEX}<title>YAQIN Gastro Cafe</title>`
  + `<meta http-equiv="refresh" content="0; url=${target}"></head>`
  + `<body><a href="${target}">YAQIN Gastro Cafe</a></body></html>\n`

function staticConfig(publicUrl) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaqin-static-'))
  return {
    env: 'static',
    isProd: false,
    host: '127.0.0.1',
    port: 0,
    publicUrl,
    dataDir,
    dbFile: ':memory:',
    uploadsDir: path.join(dataDir, 'uploads'),
    backupsDir: path.join(dataDir, 'backups'),
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    adminLogin: null,
    adminPassword: null,
    trustProxy: false,
    logger: false
  }
}

export async function buildStatic({ outDir, publicUrl }) {
  publicUrl = publicUrl.replace(/\/+$/, '')
  const base = new URL(publicUrl).pathname.replace(/\/+$/, '')
  outDir = path.resolve(outDir)
  if (!path.relative(outDir, ROOT).startsWith('..')) throw new Error(`Папка ${outDir} содержит проект`)

  const config = staticConfig(publicUrl)
  const app = await buildApp(config)
  const written = []
  const write = (file, data) => {
    const dest = path.join(outDir, file)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, data)
    written.push(file)
  }

  try {
    fs.rmSync(outDir, { recursive: true, force: true })
    const queue = []

    const pages = LANGS.flatMap(lang => [
      { url: `/${lang}`, file: `${lang}/index.html` },
      { url: `/${lang}/menu`, file: `${lang}/menu/index.html` }
    ])
    pages.push({ url: `/${DEFAULT_LANG}/404`, file: '404.html', status: 404 })

    for (const page of pages) {
      const res = await app.inject(page.url)
      if (res.statusCode !== (page.status ?? 200)) throw new Error(`${page.url}: ${res.statusCode}`)
      const html = rebase(res.body, base).replace('<meta charset="utf-8">', `<meta charset="utf-8">\n${NOINDEX}`)
      write(page.file, html)
      queue.push(...assetPaths(html, base))
    }

    const seen = new Set()
    while (queue.length) {
      const url = queue.shift()
      if (seen.has(url)) continue
      seen.add(url)
      const res = await app.inject(url)
      if (res.statusCode !== 200) throw new Error(`${url}: ${res.statusCode}`)
      if (url.endsWith('.css')) {
        const css = rebase(res.body, base)
        write(url.slice(1), css)
        queue.push(...assetPaths(css, base))
      } else {
        write(url.slice(1), res.rawPayload)
      }
    }

    write('index.html', redirectPage(`${base}/${DEFAULT_LANG}/`))
    write('menu/index.html', redirectPage(`${base}/${DEFAULT_LANG}/menu/`))
    // Без этого файла Pages прогоняет сайт через Jekyll.
    write('.nojekyll', '')
  } finally {
    await app.close()
    fs.rmSync(config.dataDir, { recursive: true, force: true })
  }
  return written
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (!process.env.PUBLIC_URL) throw new Error('Укажите PUBLIC_URL, например https://user.github.io/repo')
    const outDir = process.argv[2] ?? path.join(ROOT, 'dist')
    const files = await buildStatic({ outDir, publicUrl: process.env.PUBLIC_URL })
    console.log(`Готово: ${files.length} файлов в ${outDir}`)
  } catch (err) {
    console.error(`Не удалось собрать статическую копию: ${err.message}`)
    process.exit(1)
  }
}
