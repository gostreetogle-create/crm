import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.base.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      /**
       * Компоненты перенесены из приложения с селекторами `app-*`, `crud-layout`, `ui-modal`.
       * Постепенно приведём к единому префиксу; пока не блокируем линт на массовом rename.
       */
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/no-output-native': 'off',
      '@angular-eslint/no-output-rename': 'off',
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
    },
  },
  {
    files: ['**/ui-form-field.component.ts'],
    rules: {
      '@angular-eslint/template/label-has-associated-control': 'off',
    },
  },
];
