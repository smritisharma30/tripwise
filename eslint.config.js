// Single flat config for the whole monorepo. Each package runs `eslint .` from its own
// directory; ESLint walks up and finds this file. `files` globs are relative to this file.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/node_modules/', '**/dist/', '**/.next/', '**/.turbo/', '**/next-env.d.ts'],
  },
  js.configs.recommended,
  // Type-aware rules (e.g. no-floating-promises) need type info, so they read each
  // package's tsconfig via the project service.
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Plain JS config files aren't in any tsconfig, so skip type-aware rules there.
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
      // Pages Router only; this app uses the App Router.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  // Last: turn off any rule that would fight Prettier over formatting.
  prettier,
);
