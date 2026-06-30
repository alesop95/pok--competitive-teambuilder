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
  prepareImport,
  clearCandidateCache,
  saveTeams,
  listSavedTeams,
  loadSavedTeam,
  setDataSource,
  type FieldOverride,
} from './engine.js';
import { NodeDataSource } from './nodeDataSource.js';

// Porta di default non comune per non collidere con altri localhost; sovrascrivibile con PORT.
const PORT = Number(process.env.PORT ?? 5187);
const HOST = process.env.HOST ?? '127.0.0.1';
const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, 'public');
// Su Node l'engine legge i dati dal filesystem (ADR-009): radice dati = <progetto>/data.
setDataSource(new NodeDataSource(join(here, '..', 'data')));

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

  app.post<{ Params: { id: string }; Querystring: { topN?: string; weather?: string; terrain?: string }; Body: { importText?: string } }>(
    '/api/season/:id/generate',
    async (req) => {
      const topN = req.query.topN ? Number(req.query.topN) : 5;
      // meteo/terreno opzionali: override manuale del campo (auto = non inviato; none = neutro forzato)
      const override: FieldOverride = {};
      if (req.query.weather) override.weather = req.query.weather as FieldOverride['weather'];
      if (req.query.terrain) override.terrain = req.query.terrain as FieldOverride['terrain'];
      // vincoli iniziali opzionali: team Showdown (anche parziale) incollato dall'utente. I membri
      // riconosciuti diventano bloccati e ogni proposta li completa fino a 6.
      const importText = req.body?.importText;
      const prep = importText && importText.trim() ? await prepareImport(req.params.id, importText) : null;
      const teams = await generateForSeason(req.params.id, topN, override, prep ? { locked: prep.locked, lockedSets: prep.lockedSets } : {});
      return { teams, importWarnings: prep?.warnings ?? [], locked: prep?.locked ?? [] };
    },
  );

  // invalida la cache candidati (es. dopo aver cambiato il roster a mano)
  app.post<{ Params: { id: string } }>('/api/season/:id/refresh', async (req) => {
    clearCandidateCache(req.params.id);
    return { ok: true };
  });

  // salvataggio e storico dei team generati
  app.post<{ Params: { id: string }; Body: { teams?: unknown[]; label?: string } }>(
    '/api/season/:id/save',
    async (req, reply) => {
      const teams = req.body?.teams ?? [];
      if (!Array.isArray(teams) || teams.length === 0) {
        reply.code(400);
        return { ok: false, error: 'nessun team da salvare' };
      }
      const name = await saveTeams(req.params.id, teams, req.body?.label);
      return { ok: true, name };
    },
  );

  app.get('/api/saved', async () => ({ saved: await listSavedTeams() }));

  app.get<{ Params: { name: string } }>('/api/saved/:name', async (req, reply) => {
    try {
      return await loadSavedTeam(req.params.name);
    } catch (err) {
      reply.code(404);
      return { error: (err as Error).message };
    }
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
