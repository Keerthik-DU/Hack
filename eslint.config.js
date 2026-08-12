import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ESLint flat config — AirGap Scanner (WO-051)
 * Security rules from Architecture Security Zone 2 are enforced at error severity.
 * Prettier is last so it disables conflicting formatting rules.
 */
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      // Intentional violations used only by lint:security-verify
      'tests/fixtures/prohibited-patterns/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        // Required for type-aware rules like @typescript-eslint/no-implied-eval
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        self: 'readonly',
        Worker: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs.strict.rules,
      ...reactHooks.configs.recommended.rules,

      // Architecture Security Zone 2 — prohibited patterns (error, not warn)
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'react/no-danger': 'error',
      '@typescript-eslint/no-implied-eval': 'error',

      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['formatDuration', 'sortFindingsByConfidenceThenLine'],
        },
      ],

      // TypeScript handles undefined names and unused locals; avoid duplicate noise
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Existing codebase uses static utility classes; not a Security Zone 2 concern
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
    },
  },
  // Test / storybook-style files may export helpers alongside components
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // XSS corpus fixtures contain intentional javascript: strings for sanitizer tests
  {
    files: ['**/__fixtures__/xss-vectors.ts'],
    rules: {
      'no-script-url': 'off',
    },
  },
  // Must be last — disables ESLint formatting rules that conflict with Prettier
  prettier,
];
