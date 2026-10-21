import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs(
  { ignores: ['dist/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    // shadcn-vue primitives are copied in as-is: single-word names, optional class prop.
    files: ['src/components/ui/**'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
    },
  },
);
