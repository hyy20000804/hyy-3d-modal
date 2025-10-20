import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig(({ mode }) => {
  // 加载对应环境变量文件，mode 对应 development、production 等
  const env = loadEnv(mode, process.cwd())

  // 从 env 中取 VITE_API_URL
  const apiUrl = env.VITE_API_URL

  return {
    server: {
      host: true,
      port: 8080, // 端口号
      open: false // 是否自动打开浏览器
    },
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()]
      }),
      Components({
        resolvers: [ElementPlusResolver()]
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    // 举例：将 base 设置成 apiUrl（你根据需要改）
    base: apiUrl,

    build: {
      // sourcemap: true,
      commonjsOptions: {
        strictRequires: true // 兼容commonjs
      }
    }
  }
})
