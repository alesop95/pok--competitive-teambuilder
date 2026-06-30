// Watcher dei content creator competitivi (handoff: lettura del meta). Legge la lista canali da
// data/references/creators.json e per ciascuno scarica il feed RSS pubblico di YouTube
// (https://www.youtube.com/feeds/videos.xml?channel_id=...): nessuna API key, nessuna dipendenza.
// Stampa gli ultimi video ordinati per data, evidenziando i titoli su tornei e meta, e marca i video
// nuovi rispetto all'ultima esecuzione (registro data/references/creators_seen.json, ignorato da git).
//
// Uso: npx tsx scripts/check_creators.ts [limite per canale]   (default 6)   oppure  npm run creators
//
// Token-economy (rules/token-economy.md): parsing deterministico in codice (regex sul feed Atom),
// nessun LLM legge i feed; l'output e una tabella e lo stato e un file JSON ispezionabile.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CREATORS_FILE = join(root, 'data', 'references', 'creators.json');
const SEEN_FILE = join(root, 'data', 'references', 'creators_seen.json');

// Titoli che segnalano contenuto utile alla lettura del meta: risultati di tornei e analisi di metagame.
const META_PATTERNS = /\b(meta|metagame|tier|tournament|regional|regulation|top\s?cut|results?|usage|rankings?|spotlight)\b/i;

interface Creator {
  handle: string;
  channel_id?: string;
  url?: string;
  note?: string;
  tags?: string[];
}

interface Video {
  id: string;
  title: string;
  published: string;
  link: string;
}

// Risolve il channel_id (UC...) dalla pagina del canale quando manca in creators.json. Aggira il muro
// di consenso UE con il cookie CONSENT e forza l'inglese, come fa il resto degli scraper del progetto.
export async function resolveChannelId(handle: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/@${handle}/videos`, {
    headers: { 'Accept-Language': 'en-US', Cookie: 'CONSENT=YES+1' },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const m =
    html.match(/"channelId":"(UC[\w-]{22})"/) ||
    html.match(/"externalId":"(UC[\w-]{22})"/) ||
    html.match(/channel_id=(UC[\w-]{22})/);
  return m ? m[1] : null;
}

// Parsa un feed Atom di YouTube in una lista di video. Regex sul singolo <entry>, coerente con lo
// stile deterministico degli scraper serebii (niente parser XML, niente dipendenze).
export function parseFeed(xml: string): Video[] {
  const out: Video[] = [];
  for (const e of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const block = e[1];
    const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? '';
    const title = block.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '(senza titolo)';
    const published = block.match(/<published>([^<]+)<\/published>/)?.[1] ?? '';
    const link = block.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? (id ? `https://youtu.be/${id}` : '');
    if (id) out.push({ id, title: decodeXml(title), published, link });
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function loadSeen(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(SEEN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const limit = Number(process.argv[2]) || 6;
  const doc = JSON.parse(await readFile(CREATORS_FILE, 'utf8')) as { creators: Creator[] };
  const creators = doc.creators ?? [];
  if (creators.length === 0) {
    console.log('Nessun canale in data/references/creators.json.');
    return;
  }

  const seen = await loadSeen();
  let resolvedAny = false;

  for (const c of creators) {
    let channelId = c.channel_id;
    if (!channelId) {
      const resolved = await resolveChannelId(c.handle);
      if (!resolved) {
        console.log(`\n@${c.handle}: channel_id non risolto (pagina canale non leggibile). Salto.`);
        continue;
      }
      channelId = resolved;
      resolvedAny = true;
      console.log(`\n@${c.handle}: channel_id risolto = ${channelId} (salvalo in creators.json per le prossime volte).`);
    }

    let videos: Video[] = [];
    try {
      const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      videos = parseFeed(await res.text());
    } catch (err) {
      console.log(`\n@${c.handle}: feed non raggiungibile (${(err as Error).message}).`);
      continue;
    }

    videos.sort((a, b) => (b.published > a.published ? 1 : -1));
    const recent = videos.slice(0, limit);
    const tags = c.tags?.length ? ` [${c.tags.join(', ')}]` : '';
    console.log(`\n=== @${c.handle}${tags} ===`);
    if (c.note) console.log(c.note);
    for (const v of recent) {
      const isNew = seen[c.handle] ? v.published > seen[c.handle] : false;
      const flags = [isNew ? 'NUOVO' : '', META_PATTERNS.test(v.title) ? 'META/TORNEO' : ''].filter(Boolean).join(' ');
      const date = v.published.slice(0, 10);
      console.log(`  ${date}  ${v.title}${flags ? '  <' + flags + '>' : ''}`);
      console.log(`            ${v.link}`);
    }
    if (recent[0]) seen[c.handle] = recent[0].published;
  }

  await writeFile(SEEN_FILE, JSON.stringify(seen, null, 2) + '\n', 'utf8');
  if (resolvedAny) console.log('\nSuggerimento: aggiungi i channel_id risolti in data/references/creators.json per evitare la risoluzione a ogni esecuzione.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
