import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/MembersSearchView.vue') },
      { path: 'members/new', name: 'member-new', component: () => import('@/views/MemberCreateView.vue') },
      { path: 'members/:id', name: 'member-detail', component: () => import('@/views/MemberDetailView.vue'), props: true },
      { path: 'members/:id/edit', name: 'member-edit', component: () => import('@/views/MemberEditView.vue'), props: true },
      { path: 'members/:id/payments/new', name: 'payment-new', component: () => import('@/views/PaymentCreateView.vue'), props: true },
      { path: 'members/:id/payments/:pid', name: 'payment-edit', component: () => import('@/views/PaymentEditView.vue'), props: true },
      { path: 'history', name: 'history', component: () => import('@/views/PaymentsHistoryView.vue') },
      { path: 'items', name: 'items', component: () => import('@/views/ItemsView.vue') },
      { path: 'stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
      { path: 'account/password', name: 'change-password', component: () => import('@/views/ChangePasswordView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthed()) {
    return { path: '/login', query: { next: to.fullPath } }
  }
  if (to.path === '/login' && auth.isAuthed()) {
    return { path: '/' }
  }
})

export default router
