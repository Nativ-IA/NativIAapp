import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Las pruebas de este paquete son unitarias y puras: no tocan la base de
    // datos ni la red. El pipeline completo del tutor se cubre con la suite de
    // evals (docs/07-llm-prompts-library.md §6), que corre por separado.
  },
});
