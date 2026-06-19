import globals from 'globals';
import { baseConfig } from './base.js';

/** @type {import("eslint").Linter.Config[]} */
export const nextConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];

export default nextConfig;
