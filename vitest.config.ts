// Config dedicata a Vitest, separata da vite.config.ts. Serve perché vite.config.ts ha root in web/
// (build della SPA client-side): senza questa, Vitest erediterebbe quel root e non troverebbe i test.
// Vitest dà precedenza a vitest.config.* su vite.config.*, quindi qui si fissano root di progetto e
// la cartella dei test. I test del motore girano in ambiente Node (default), offline.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
