import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router';
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

// One chunk per area, so participants never download admin code. Screens
// are children of their area's layout.
const areas: { path: string; role: Role; layout: () => Promise<unknown> }[] = [
  {
    path: '/app',
    role: 'USER',
    layout: () => import('@/app/layouts/ParticipantLayout.vue'),
  },
  {
    path: '/psychologist',
    role: 'PSYCHOLOGIST',
    layout: () => import('@/app/layouts/PsychologistLayout.vue'),
  },
  {
    path: '/admin',
    role: 'ADMIN',
    layout: () => import('@/app/layouts/AdminLayout.vue'),
  },
];

// Screens specific to one area, added as the features are built.
const areaChildren: Record<Role, RouteRecordRaw[]> = {
  USER: [],
  PSYCHOLOGIST: [],
  ADMIN: [
    {
      path: 'participants',
      component: () => import('@/features/admin/ParticipantsPage.vue'),
    },
    {
      path: 'psychologists',
      component: () => import('@/features/admin/PsychologistsPage.vue'),
    },
  ],
};

const areaRoutes: RouteRecordRaw[] = areas.map(({ path, role, layout }) => ({
  path,
  component: layout,
  meta: { role },
  children: [
    { path: '', component: () => import('@/app/AreaHome.vue') },
    {
      path: 'rules',
      component: () => import('@/features/pages/GeneralRulesPage.vue'),
    },
    ...areaChildren[role],
  ],
}));

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
    ...areaRoutes,
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
