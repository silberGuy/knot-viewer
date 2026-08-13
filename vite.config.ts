import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue({
    ...templateCompilerOptions
  })],
  base: '/knot-viewer',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
})
