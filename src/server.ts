// Entrypoint Fastify dell'app (handoff §6). In Fase 0 espone solo una rotta di health,
// per verificare che lo scaffold sia avviabile. Le rotte di generazione team arrivano in Fase 2.
import Fastify from 'fastify';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ status: 'ok', phase: 'scaffold' }));

  return app;
}

// Avvio diretto solo quando il file è eseguito come entrypoint (npm run dev).
// pathToFileURL gestisce correttamente i path Windows e l'URL-encoding (es. la è di "pokè").
const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const app = buildServer();
  app
    .listen({ port: PORT, host: HOST })
    .then((address) => {
      app.log.info(`poke-competitive-teambuilder in ascolto su ${address}`);
    })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
