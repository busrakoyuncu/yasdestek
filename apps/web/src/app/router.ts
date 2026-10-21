import { createRouter, createWebHistory } from 'vue-router';
import { homeFor, sessionQuery } from '@/features/auth/useSession';
import { queryClient } from '@/lib/query';
import type { Role } from '@/types/user';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    role?: Role;
    allowPasswordChangePending?: boolean;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'login' } },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/features/auth/ChangePasswordPage.vue'),
      meta: { allowPasswordChangePending: true },
    },
    // One chunk per area, so participants never download admin code.
    {
      path: '/app',
      component: () => import('@/app/AreaPlaceholder.vue'),
      meta: { role: 'USER' },
    },
    {
      path: '/psychologist',
      component: () => import('@/app/AreaPlaceholder.vue'),
      meta: { role: 'PSYCHOLOGIST' },
    },
    {
      path: '/admin',
      component: () => import('@/app/AreaPlaceholder.vue'),
      meta: { role: 'ADMIN' },
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'login' } },
  ],
});

// UX only: the api enforces every permission again. Reads the session once
// per page load (cached afterwards) and sends people where they belong.
router.beforeEach(async (to) => {
  const user = await queryClient.ensureQueryData(sessionQuery);
  if (to.meta.public) return user ? homeFor[user.role] : true;
  if (!user)
    return {
      name: 'login',
      query: to.fullPath === '/' ? {} : { redirect: to.fullPath },
    };
  if (user.mustChangePassword && !to.meta.allowPasswordChangePending) {
    return { name: 'change-password' };
  }
  if (to.meta.role && to.meta.role !== user.role) return homeFor[user.role];
  return true;
});
