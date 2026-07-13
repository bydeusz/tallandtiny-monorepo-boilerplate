import globals from 'globals';
import nestjsTyped from '@darraghor/eslint-plugin-nestjs-typed';
import trilon from '@trilon/eslint-plugin';
import nestjsSecurity from 'eslint-plugin-nestjs-security';
import security from 'eslint-plugin-security';
import noSecrets from 'eslint-plugin-no-secrets';
import { baseConfig } from './base.js';

// PII / secret patterns to catch directly in source (gitleaks covers runtime
// secret-scanning in the hooks; this catches hard-coded PII in the code itself).
// Email is intentionally omitted: it fires on Swagger examples / fixtures rather
// than real secrets, and gitleaks + entropy already cover leaked credentials.
const piiRegexes = {
  'Dutch BSN (9 digits)': '\\b\\d{9}\\b',
  IBAN: '\\b[A-Z]{2}\\d{2}[A-Z0-9]{11,30}\\b',
};

// nestjs-typed's flat recommended config brings its own parser + rules but does
// NOT enable type-aware parsing (many of its rules need it). Scope it — and all
// type-aware config below — to `src/**` so non-project files (e.g. *.config.ts)
// are never handed to type-requiring rules, which would otherwise crash ESLint.
const nestjsTypedRecommended = nestjsTyped.configs.flatRecommended.map((c) => ({
  ...c,
  files: ['src/**/*.ts'],
}));

/** @type {import("eslint").Linter.Config[]} */
export const nestConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // NestJS DI relies on decorator metadata; these are noisy in idiomatic Nest code
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Type-aware linting for the Nest source (required by @darraghor/nestjs-typed).
  // `projectService` auto-discovers the nearest tsconfig for each file.
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true },
    },
  },

  // @darraghor/eslint-plugin-nestjs-typed — providers are provided, DTO props
  // carry class-validator decorators, Swagger decorators match optionality.
  ...nestjsTypedRecommended,
  // Recognise the project's custom paginated-response decorator so paginated
  // endpoints satisfy api-method-should-specify-api-response.
  {
    files: ['src/**/*.ts'],
    rules: {
      '@darraghor/nestjs-typed/api-method-should-specify-api-response': [
        'error',
        { additionalCustomApiResponseDecorators: ['ApiPaginatedResponse'] },
      ],
    },
  },

  // @trilon/eslint-plugin (Trilon's official plugin) — DI / decorator correctness
  // that the other plugins don't cover.
  {
    files: ['src/**/*.ts'],
    plugins: { '@trilon': trilon },
    rules: {
      '@trilon/check-inject-decorator': 'error',
      '@trilon/detect-circular-reference': 'error',
      '@trilon/enforce-close-testing-module': 'error',
    },
  },

  // eslint-plugin-nestjs-security — guards, rate-limiting, validation, exposed
  // fields. This app registers a global ValidationPipe (main.ts) and
  // JwtAuthGuard / RolesGuard / ThrottlerGuard globally via APP_GUARD
  // (app.module.ts), so the rules are told to assume them — without this every
  // route/DTO would false-positive.
  {
    files: ['src/**/*.ts'],
    plugins: { 'nestjs-security': nestjsSecurity },
    rules: {
      'nestjs-security/require-guards': ['error', { assumeGlobalGuards: true }],
      'nestjs-security/require-throttler': ['error', { assumeGlobalThrottler: true }],
      'nestjs-security/no-missing-validation-pipe': [
        'error',
        { assumeGlobalPipes: true },
      ],
      'nestjs-security/require-class-validator': 'error',
      'nestjs-security/no-exposed-private-fields': 'error',
      // Heuristic that only matched non-endpoints (config / env / logger) and the
      // intentionally-public health controller here — off to avoid pure noise.
      'nestjs-security/no-exposed-debug-endpoints': 'off',
    },
  },
  // Response / output DTOs take no user input, so they need no class-validator
  // decorators. Keep require-class-validator scoped to request DTOs.
  {
    files: ['**/*-response.dto.ts', 'src/common/dto/**'],
    rules: { 'nestjs-security/require-class-validator': 'off' },
  },
  // Auth DTOs legitimately carry password / token fields (credentials in, tokens
  // out); no-exposed-private-fields would only false-positive on them.
  {
    files: ['src/modules/auth/dto/**'],
    rules: { 'nestjs-security/no-exposed-private-fields': 'off' },
  },

  // eslint-plugin-security — generic Node security floor.
  { ...security.configs.recommended, files: ['src/**/*.ts'] },
  {
    // detect-object-injection is a heuristic that flags every computed member
    // access (`obj[key]`); keep it as a warning so it informs without blocking.
    files: ['src/**/*.ts'],
    rules: {
      'security/detect-object-injection': 'warn',
    },
  },

  // eslint-plugin-no-secrets — high-entropy strings + PII (BSN / IBAN / email).
  {
    files: ['src/**/*.ts'],
    plugins: { 'no-secrets': noSecrets },
    rules: {
      'no-secrets/no-secrets': [
        'error',
        { tolerance: 4.2, additionalRegexes: piiRegexes },
      ],
    },
  },
];

export default nestConfig;
