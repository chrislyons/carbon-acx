#!/usr/bin/env node
// serve-static.mjs — static file server with Next-export friendly URLs:
// '/' -> index.html; extensionless paths -> path.html. Usage:
//   node scripts/serve-static.mjs [port] [rootDir]
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const port = Number(process.argv[2] ?? 4173)
const root = process.argv[3] ?? 'dist/site'
const ROOT_ABS = resolve(root)
// Reject normalized paths that escape the served root (encoded or plain ../).
const contained = (file) => {
  const abs = resolve(file)
  return abs === ROOT_ABS || abs.startsWith(ROOT_ABS + sep) ? abs : null
}
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain', '.csv': 'text/csv', '.ico': 'image/x-icon',
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname.split('?')[0])
  const candidates = [join(root, path)]
  if (!extname(path)) candidates.push(join(root, `${path.replace(/\/$/, '')}.html`))
  if (path.endsWith('/')) candidates.push(join(root, path, 'index.html'))
  for (const candidate of candidates) {
    const file = contained(candidate)
    if (!file) continue
    try {
      const data = await readFile(file)
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      res.end(data)
      return
    } catch { /* try next candidate */ }
  }
  res.writeHead(404, { 'content-type': 'text/html' }).end('<h1>404</h1>')
}).listen(port, () => console.log(`Serving HTTP on http://[IP_ADDRESS]:${port} from ${root}`))
