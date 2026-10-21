import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './app/router';
import { i18n } from './lib/i18n';
import './style.css';

createApp(App).use(router).use(i18n).use(VueQueryPlugin).mount('#app');
