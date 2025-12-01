// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import index from '@/views/index.vue'
import cold from '@/views/cold.vue'
import three from '@/views/three.vue'

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
  },
  {
    path: '/three',
    name: 'three',
    component: three
  }
]

export default routes
