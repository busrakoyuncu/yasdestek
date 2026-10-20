import { createRouter, createWebHistory } from 'vue-router';
import HomePage from './HomePage.vue';

// Areas land here one by one: /login, /app, /psychologist, /admin.
export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: HomePage }],
});
