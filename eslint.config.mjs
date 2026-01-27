import globals from 'globals';
import pluginJs from '@eslint/js';

export default {
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module', // Use ES module syntax
    globals: globals.node, // Set Node.js globals
  },
  ignores: [
    '**/coverage/**',
    '**/logs/**',
    '**/prod/**',
    '**/.github/**',
    '**/node_modules/**',
    'build/',
    '**/*.test.js',
    'src/someLargeFile.js',
    'src/ignore-this-directory/**',
  ],
  rules: {
    indent: ['error', 2], // Enforce 2-space indentation
    'linebreak-style': ['error', 'unix'], // Enforce Unix linebreaks
    quotes: ['error', 'single'], // Enforce single quotes
    semi: ['error', 'always'], // Enforce semicolons
  },
  ...pluginJs.configs.recommended, // Include recommended ESLint rules
};