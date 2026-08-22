import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>)
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function writeJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Same YouTube preview/thumbnail handlers as Vercel `api/youtube/*` — no :3001 server. */
function youtubeDevApi(): Plugin {
  return {
    name: 'nsv-youtube-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith('/api/youtube/')) {
          next()
          return
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        try {
          if (path === '/api/youtube/preview' && req.method === 'POST') {
            const body = await readJsonBody(req)
            const url = typeof body.url === 'string' ? body.url.trim() : ''
            if (!url) {
              writeJson(res, 400, { ok: false, error: 'url is required' })
              return
            }
            const { buildYoutubePreview } = await import('./server/lib/youtube-preview.mjs')
            const result = await buildYoutubePreview(url)
            writeJson(res, result.ok ? 200 : 400, result)
            return
          }

          if (path === '/api/youtube/thumbnail' && req.method === 'GET') {
            const { searchParams } = new URL(req.url ?? '', 'http://localhost')
            const rawUrl = searchParams.get('url') ?? ''
            const rawId = searchParams.get('id') ?? ''
            const { youtubeVideoIdFromUrl } = await import('./scripts/lib/tour-import-utils.mjs')
            const videoId = rawId.trim() || (rawUrl ? youtubeVideoIdFromUrl(rawUrl) : null)
            if (!videoId) {
              writeJson(res, 400, { ok: false, error: 'id or url is required' })
              return
            }
            const { fetchYoutubeThumbnailBuffer } = await import(
              './scripts/lib/youtube-screenshot.mjs'
            )
            const buffer = await fetchYoutubeThumbnailBuffer(
              rawUrl.trim() || `https://www.youtube.com/watch?v=${videoId}`,
            )
            res.statusCode = 200
            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buffer)
            return
          }

          writeJson(res, 405, { ok: false, error: 'Method not allowed' })
        } catch (err) {
          writeJson(res, 502, {
            ok: false,
            error: err instanceof Error ? err.message : 'YouTube API failed',
          })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), youtubeDevApi()],
  server: {
    strictPort: true,
    proxy: {
      '/api/bulk-import': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'react-vendor'
          if (id.includes('node_modules/react/')) return 'react-vendor'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/gsap')) return 'gsap'
          if (id.includes('node_modules/lenis')) return 'lenis'
        },
      },
    },
  },
})
