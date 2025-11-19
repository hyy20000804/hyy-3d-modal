// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import index from '@/views/index.vue'
import cold from '@/views/cold.vue'

const routes = [
  {
    path: '/',
    name: 'index',
    component: index
  },
  {
    path: '/cold',
    name: 'cold',
    component: cold
  }
]

export default routes
