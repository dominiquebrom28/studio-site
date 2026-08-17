import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // `.claude/worktrees/` holds agent scratch worktrees — full checkouts of this
  // same repo. Without this ignore, eslint lints every stale worktree's copy of
  // `src/` alongside the real one and reports each finding twice (24 warnings
  // where there are 12), so a phantom duplicate looks like a second real defect.
  // Gitignored via `.git/info/exclude`, which eslint does not read.
  { ignores: ['dist', 'node_modules', '.claude/worktrees'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // spec §5 #19 — no raw HTML injection from markdown, ever
      'no-restricted-properties': [
        'error',
        {
          object: '*',
          property: 'dangerouslySetInnerHTML',
          message: 'dangerouslySetInnerHTML is banned — markdown is rendered via react-markdown only (spec §5 #19).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned — markdown is rendered via react-markdown only (spec §5 #19).',
        },
      ],
    },
  },
);
