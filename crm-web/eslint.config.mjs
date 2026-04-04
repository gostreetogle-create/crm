import baseConfig from './eslint.base.config.mjs';
import nx from '@nx/eslint-plugin';

export default [
  ...baseConfig,
  {
    ignores: ['**/dist', '**/out-tsc', '**/canonical-roles.generated.ts'],
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/eqeqeq': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
    },
  },
  {
    files: ['src/app/shared/ui/form-grid/ui-form-grid.component.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
    },
  },
];
