// Entrypoint Fastify (handoff §5, Fase 2): serve il frontend statico e l'API del motore.
// Rotte: health, lista stagioni, dettaglio stagione, meta (parsed + raw editabile) e generazione.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import {
  listSeasons,
  loadSeason,
  loadMeta,
  loadMetaRaw,
  saveMetaRaw,
  generateForSeason,
  clearCandidateCache,
} from './engine.js';

// Porta di default non comune per non collidere con altri localhost; sovrascrivibile con PORT.
const PORT = Number(process.env.PORT ?? 5187);
const HOST = process.env.HOST ?? '127.0.0.1';
const publicDir = join(dirname(fileURLToPath(import.meta.url)), 'public');

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(fastifyStatic, { root: publicDir, prefix: '/' });

  app.get('/health', async () => ({ status: 'ok', phase: 'fase2' }));

  app.get('/api/seasons', async () => ({ seasons: await listSeasons() }));

  app.get<{ Params: { id: string } }>('/api/season/:id', async (req) => {
    const season = await loadSeason(req.params.id);
    const meta = await loadMeta(req.params.id);
    return { season, meta };
  });

  app.get<{ Params: { id: string } }>('/api/season/:id/meta/raw', async (req, reply) => {
    reply.type('text/plain');
    return loadMetaRaw(req.params.id);
  });

  app.put<{ Params: { id: string }; Body: string }>('/api/season/:id/meta/raw', async (req, reply) => {
    try {
      await saveMetaRaw(req.params.id, typeof req.body === 'string' ? req.body : String(req.body));
      return { ok: true };
    } catch (err) {
      reply.code(400);
      return { ok: false, error: (err as Error).message };
    }
  });

  app.post<{ Params: { id: string }; Querystring: { topN?: string } }>(
    '/api/season/:id/generate',
    async (req) => {
      const topN = req.query.topN ? Number(req.query.topN) : 5;
      const teams = await generateForSeason(req.params.id, topN);
      return { teams };
    },
  );

  // invalida la cache candidati (es. dopo aver cambiato il roster a mano)
  app.post<{ Params: { id: string } }>('/api/season/:id/refresh', async (req) => {
    clearCandidateCache(req.params.id);
    return { ok: true };
  });

  return app;
}

const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const app = buildServer();
  app
    .listen({ port: PORT, host: HOST })
    .then((address) => app.log.info(`poke-competitive-teambuilder in ascolto su ${address}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
