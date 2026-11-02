import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: 'Sign in', public: true } },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: 'Dashboard' } },
        { path: 'documents', name: 'documents', component: () => import('@/views/documents/DocumentListView.vue'), meta: { title: 'Documents' } },
        { path: 'documents/upload', name: 'document-upload', component: () => import('@/views/documents/DocumentUploadView.vue'), meta: { title: 'Upload document' } },
        { path: 'web-pages/import', name: 'web-page-import', component: () => import('@/views/webPages/WebPageImportView.vue'), meta: { title: 'Import web pages' } },
        { path: 'documents/:documentId', name: 'document-detail', component: () => import('@/views/documents/DocumentDetailView.vue'), meta: { title: 'Document details' } },
        { path: 'search', name: 'search', component: () => import('@/views/SearchView.vue'), meta: { title: 'Search passages' } },
        { path: 'model-settings', name: 'model-settings', component: () => import('@/views/ModelSettingsView.vue'), meta: { title: 'Model settings' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) await auth.restoreSession();
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'home' };
  return true;
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title || 'Home')} · RAG Lab`;
});

window.addEventListener('auth:unauthorized', () => {
  const auth = useAuthStore();
  auth.clearSession();
  if (router.currentRoute.value.name !== 'login') {
    void router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
  }
});

export default router;
