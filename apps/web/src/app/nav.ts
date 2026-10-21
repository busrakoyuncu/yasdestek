import type { Component } from 'vue';

// One entry per screen in an area's navigation. Labels are i18n keys.
export type NavItem = { to: string; label: string; icon: Component };
