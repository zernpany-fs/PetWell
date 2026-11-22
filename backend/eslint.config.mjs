// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'src/database/generated/**', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // formatting is Prettier's job; turn off rules that clash with it
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Allow intentionally unused args/vars when prefixed with _,
      // and fields dropped with a rest pattern
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // `const { password, ...rest } = user` is how we drop fields
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
