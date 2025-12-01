import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import routes from '@/router/router'
import { createRouter, createWebHashHistory } from 'vue-router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/icons/iconfont.css'

new PerformanceObserver(entryList => {
  for (const entry of entryList.getEntries()) {
    console.log(
      'LCP element:',
      entry.element,
      'tag:',
      entry.element?.tagName, // 观看其中的 是否不为canvas即可
      'startTime:',
      entry.startTime,
      'renderTime:',
      entry.renderTime // 观看其中的 renderTime
    )
  }
}).observe({ type: 'largest-contentful-paint', buffered: true })

const router = createRouter({
  // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
  history: createWebHashHistory(),
  routes // `routes: routes` 的缩写
})
// 5. 创建并挂载根实例
const app = createApp(App)
//确保 _use_ 路由实例使
//整个应用支持路由。
app.use(router)

// 全局注册icon（后期可优化，按需注册）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
