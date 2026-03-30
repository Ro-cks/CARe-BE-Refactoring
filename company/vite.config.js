import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 부모 디렉터리의 GLB 파일을 /models/ 경로로 서빙하는 플러그인
const serveGlbPlugin = {
  name: 'serve-parent-glb',
  configureServer(server) {
    server.middlewares.use('/models', (req, res, next) => {
      const fileName = req.url.replace(/^\//, '')
      const filePath = path.resolve(__dirname, '..', fileName)
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'model/gltf-binary')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        fs.createReadStream(filePath).pipe(res)
      } else {
        next()
      }
    })
  }
}

export default defineConfig({
  plugins: [react(), serveGlbPlugin],
  base: '/company/',
  server: {
    port: 3000,
    fs: { allow: [path.resolve(__dirname, '..')] },
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true }
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  }
})
