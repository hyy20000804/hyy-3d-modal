import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  server: {
    host: true,
    port: 8080,
    open: false
  },

  plugins: [
    vue(),
    cesium(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  base: './', // ⭐ 本地开发必须这样写！

  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },

  build: {
    target: 'esnext'
  }
})
