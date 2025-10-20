const routes = [
  {
    path: '/',
    name: 'index',
    component: () => import('@/views/index.vue'),
    meta: {
      activePath: '/'
    }
  }
]

export default routes
