// =============================================================================
// Fronteras del monolito modular (ADR-001). Corre en CI con `pnpm lint:modules`.
//
// Las reglas `error` rompen el build. La regla `warn` marca deuda conocida que
// se paga a medida que se toca cada módulo (ver src/modules/README.md).
// =============================================================================

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'modulo-solo-por-index',
      comment:
        'Un módulo solo importa el index.ts de otro módulo, nunca sus archivos internos.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/[^/]+/',
        pathNot: ['^src/modules/$1/', '^src/modules/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'shared-no-conoce-modulos',
      comment: 'El núcleo compartido no depende de ningún módulo.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'contenido-solo-por-su-modulo',
      comment: 'Dentro del API, solo el módulo contenido importa @nativia/content.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/modules/contenido/' },
      to: { path: 'packages/content/' },
    },
    {
      name: 'sin-ciclos',
      comment: 'Dos módulos que se importan entre sí ya no se pueden separar.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'base-solo-por-shared-db',
      comment:
        'La base se usa a través de shared/db.ts, que filtra por colegio. Nadie más importa @nativia/db.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/shared/db\\.ts$' },
      to: { path: 'packages/db/' },
    },
    {
      name: 'tablas-solo-desde-repo',
      comment:
        'Deuda conocida: solo el repo.ts de cada módulo debería tocar la base de datos.',
      severity: 'warn',
      from: { path: '^src/modules/', pathNot: '/repo\\.ts$' },
      to: { path: '^src/shared/db\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'node', 'default'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
