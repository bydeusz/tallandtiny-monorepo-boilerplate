/**
 * dependency-cruiser — encodes the NestJS layer boundaries for apps/api.
 *
 * There is no official ESLint plugin that enforces the Nest *folder* structure
 * (the @trilon/nestjs-typed plugins cover DI & decorators, not layering), so the
 * architectural boundaries live here. Run against the Nest source:
 *
 *   npx depcruise apps/api/src --config .dependency-cruiser.js
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular dependencies make modules impossible to reason about in isolation and break clean startup ordering. Break the cycle (extract a shared unit, or invert the dependency).',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-controller-to-controller',
      severity: 'error',
      comment:
        'Controllers are transport entrypoints, not building blocks. A controller must not import another controller — move shared logic into a service.',
      from: { path: '\\.controller\\.ts$' },
      to: { path: '\\.controller\\.ts$' },
    },
    {
      name: 'no-controller-imported-cross-module',
      severity: 'error',
      comment:
        "Only a module's own *.module.ts may reference its controller. Reaching another module's controller crosses the transport boundary — talk to its service instead.",
      from: {
        path: 'apps/api/src/modules/([^/]+)/',
        pathNot: '\\.module\\.ts$',
      },
      to: {
        path: 'apps/api/src/modules/([^/]+)/[^/]+\\.controller\\.ts$',
        pathNot: 'apps/api/src/modules/$1/',
      },
    },
    {
      name: 'no-transport-in-service-layer',
      severity: 'error',
      comment:
        'Business logic in the service/domain layer must stay transport-agnostic. Do not import HTTP transport (express / @nestjs/platform-express) into a *.service.ts — keep request/response handling in controllers.',
      from: { path: '\\.service\\.ts$' },
      to: {
        dependencyTypes: ['npm'],
        path: 'node_modules/(express|@nestjs/platform-express)(/|$)',
      },
    },
    {
      name: 'no-cross-module-internals',
      severity: 'error',
      comment:
        "Do not reach into another module's request DTOs / interfaces — those are internal shapes; promote anything shared to src/common. Exceptions: *-response.dto.ts (a module's public output contract, which other modules may reference, e.g. a controller documenting the type it returns) and shared contract constants under constants/ (a leaf public contract imported directly to avoid module cycles, e.g. queue job names).",
      from: { path: 'apps/api/src/modules/([^/]+)/' },
      to: {
        path: 'apps/api/src/modules/[^/]+/(?:dto|interfaces)/',
        pathNot: ['apps/api/src/modules/$1/', '-response\\.dto\\.ts$'],
      },
    },
  ],
  options: {
    // Only follow runtime imports; `import type { … }` is compile-time only and
    // must not count as a transport/boundary dependency.
    tsPreCompilationDeps: false,
    // No tsConfig: the app uses no path aliases, and pointing at
    // apps/api/tsconfig.json makes TS resolve its `include: ["src"]` relative to
    // the cwd (repo root) instead of the tsconfig dir. dependency-cruiser's own
    // resolver handles the .ts files fine without it.
    // Architecture rules apply to production code, not test files.
    exclude: { path: '\\.(test|spec)\\.ts$' },
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
