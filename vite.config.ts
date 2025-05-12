import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'

// Plugin to copy index.html as 404.html
function spaFallbackPlugin() {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const indexPath = resolve(__dirname, 'dist/index.html')
      const fallbackPath = resolve(__dirname, 'dist/404.html')
      fs.copyFileSync(indexPath, fallbackPath)
    }
  }
}


// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), spaFallbackPlugin()],
  base: process.env.VITE_BASE_URL,
  build: {
    outDir: 'dist',
  }
})
