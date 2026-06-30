// Interfaccia client-side (ADR-009/ADR-011): stessa SPA della versione server, ma il motore non si
// raggiunge più via API REST. Qui le funzioni dell'engine si importano come modulo e si eseguono nel
// browser; i dati di stagione arrivano via fetch (BrowserDataSource) e lo storico va su IndexedDB.
// La logica di interfaccia (tab, rendering delle card, export) è la stessa della SPA Fastify: cambia
// solo lo strato di accesso al motore, prima `fetch('/api/...')`, ora chiamate dirette.
import {
  setDataSource,
  listSeasons,
  loadSeason,
  loadMeta,
  loadMetaRaw,
  saveMetaRaw,
  generateForSeason,
  prepareImport,
  saveTeams,
  listSavedTeams,
  loadSavedTeam,
} from '../src/engine.js';
import { BrowserDataSource } from '../src/browserDataSource.js';

// Inietta l'accesso ai dati del browser: lettura via fetch degli asset statici, scrittura su IndexedDB.
// La radice usa import.meta.env.BASE_URL (iniettata da Vite): "/" in sviluppo, il sottopercorso del
// repo in produzione su GitHub Pages, così i fetch dei dati seguono lo stesso prefisso degli asset.
setDataSource(new BrowserDataSource(import.meta.env.BASE_URL));

const $ = (sel: string): any => document.querySelector(sel);
const seasonSel = $('#season');
let currentId: string | null = null;

// --- Strato motore locale: replica i vecchi endpoint REST come chiamate dirette all'engine ---

async function apiSeasonDetail(id: string) {
  return { season: await loadSeason(id), meta: await loadMeta(id) };
}

async function apiGenerate(id: string, topN: number, weatherSel: string, terrainSel: string, importText: string) {
  const override: any = {};
  if (weatherSel !== 'auto') override.weather = weatherSel;
  if (terrainSel !== 'auto') override.terrain = terrainSel;
  // vincoli iniziali: stessa preparazione che faceva il server (parse + risoluzione + legalità)
  const prep = importText && importText.trim() ? await prepareImport(id, importText) : null;
  const teams = await generateForSeason(id, topN, override, prep ? { locked: prep.locked, lockedSets: prep.lockedSets } : {});
  return { teams, importWarnings: prep ? prep.warnings : [], locked: prep ? prep.locked : [] };
}

// --- Interfaccia (identica alla SPA Fastify) ---

document.querySelectorAll('nav button').forEach((b: any) => {
  b.onclick = () => {
    document.querySelectorAll('nav button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('main section').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $('#' + b.dataset.tab).classList.add('active');
    if (b.dataset.tab === 'storico') loadStorico();
  };
});

async function loadSeasons() {
  const seasons = await listSeasons();
  seasonSel.innerHTML = seasons.map((s) => `<option value="${s}">${s}</option>`).join('');
  currentId = seasons[0];
  if (currentId) await onSeasonChange();
}

async function onSeasonChange() {
  currentId = seasonSel.value || currentId;
  const { season, meta } = await apiSeasonDetail(currentId as string);
  const reg: any = (season as any).regulation || {};
  const roster = ((season as any).available_pokemon || []).length;
  $('#seasonInfo').textContent = `${(season as any).format} · ${reg.name || currentId} · ${roster} forme · ${(meta.top_threats || []).length} minacce meta`;
  $('#setupBody').innerHTML = `
    <h3 style="margin-top:0">Stagione ${(season as any).season_id}</h3>
    <p><strong>Formato:</strong> ${(season as any).format} &nbsp; <strong>Regolamento:</strong> ${reg.name || '-'}</p>
    <p class="muted">${reg.restricted_note || ''}</p>
    <p><strong>Squadra:</strong> porta ${reg.team?.bring_min}-${reg.team?.bring_max}, ne giochi ${reg.team?.pick} · ${reg.team?.level_rule || ''}</p>
    <p><strong>Roster disponibile:</strong> ${roster} forme · <strong>Minacce meta:</strong> ${(meta.top_threats || []).length}</p>
    <p class="muted">Validità: ${reg.active_from_utc || '?'} → ${reg.active_until_utc || '?'}</p>`;
  $('#metaText').value = await loadMetaRaw(currentId as string);
}
seasonSel.onchange = onSeasonChange;

$('#metaSave').onclick = async () => {
  $('#metaStatus').textContent = 'Salvataggio…';
  try {
    await saveMetaRaw(currentId as string, $('#metaText').value);
    $('#metaStatus').textContent = 'Salvato (nel browser).';
  } catch (e: any) {
    $('#metaStatus').textContent = 'Errore: ' + e.message;
  }
};

function roleChips(roles: string[]) {
  const r = roles || [];
  return r.length ? r.join(', ') : 'supporto generico';
}

function teamCard(t: any) {
  const members = t.members.map((m: string) => `<span class="mon">${m} <small>${roleChips(t.roles[m])}</small></span>`).join('');
  const strengths = (t.strengths || []).map((s: string) => `<li class="tag-good">${s}</li>`).join('');
  const weak = (t.weaknesses || []).length ? `Debolezze impilate: <span class="tag-warn">${t.weaknesses.join(', ')}</span>` : 'Nessuna debolezza di tipo impilata.';
  const offensive = (t.offensive || []).map((o: any) => `<li class="${o.answered ? 'tag-good' : 'tag-warn'}">${o.threat}: ${o.by} con ${o.move} → ${o.pctMax}%</li>`).join('');
  const sp = (obj: any) => Object.entries(obj || {}).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' / ');
  const sets = (t.sets || []).map((s: any) => `<div class="set"><strong>${s.species}</strong> @ ${s.item} · ${s.ability} · ${s.nature}<br><span class="muted">SP:</span> ${sp(s.statPoints)}<br><span class="muted">Mosse:</span> ${(s.moves || []).join(' / ')}</div>`).join('');
  const notes = (t.notes || []).map((n: string) => `<li>${n}</li>`).join('');
  // Export in formato Showdown (EV), prodotto dall'engine. Fallback al formato base per i team salvati
  // prima della feature (privi di showdownText).
  const exportText = t.showdownText || ((t.sets || []).map((s: any) =>
    `${s.species} @ ${s.item}\nAbility: ${s.ability}\nLevel: 50\n${s.nature} Nature\n` + (s.moves || []).map((m: string) => '- ' + m).join('\n')
  ).join('\n\n'));
  return `<div class="card">
    <h3>${t.archetype} <span class="score">score ${t.score}</span></h3>
    <div class="members">${members}</div>
    ${sets ? '<strong>Set completi</strong><div class="sets">' + sets + '</div>' : ''}
    ${strengths ? '<strong>Punti di forza</strong><ul>' + strengths + '</ul>' : ''}
    <p>${weak}</p>
    ${offensive ? '<strong>Coverage offensiva vs meta (danno reale @smogon/calc)</strong><ul>' + offensive + '</ul>' : ''}
    ${notes ? '<strong>Note di coverage</strong><ul>' + notes + '</ul>' : ''}
    <div class="row">
      <button onclick='copyText(this)' data-text="${encodeURIComponent(exportText)}">Esporta (Showdown)</button>
      <span class="status"></span>
    </div>
    <pre class="export" hidden>${exportText}</pre>
  </div>`;
}

(window as any).copyText = (btn: any) => {
  const txt = decodeURIComponent(btn.dataset.text);
  const pre = btn.parentElement.nextElementSibling;
  navigator.clipboard?.writeText(txt).then(
    () => { btn.nextElementSibling.textContent = 'Copiato negli appunti.'; },
    () => { pre.hidden = false; btn.nextElementSibling.textContent = 'Copia manuale dal box sotto.'; },
  );
};

$('#clearImport').onclick = () => { $('#importText').value = ''; $('#importInfo').innerHTML = ''; };

let lastTeams: any[] = [];
$('#genBtn').onclick = async () => {
  $('#genStatus').textContent = 'Genero (primo run: caricamento dati + tagging + damage calc, ~1-3s)…';
  $('#teams').innerHTML = '';
  $('#importInfo').innerHTML = '';
  $('#saveBtn').disabled = true;
  try {
    const topN = Number($('#topN').value) || 5;
    const importText = $('#importText').value.trim();
    const { teams, importWarnings, locked } = await apiGenerate(currentId as string, topN, $('#weather').value, $('#terrain').value, importText);
    lastTeams = teams;
    $('#teams').innerHTML = teams.map(teamCard).join('');
    $('#genStatus').textContent = `${teams.length} proposte.`;
    if (importText) {
      const lockChips = (locked || []).map((m: string) => `<span class="mon">${m}</span>`).join(' ');
      const warns = (importWarnings || []).map((w: string) => `<li class="tag-warn">${w}</li>`).join('');
      $('#importInfo').innerHTML =
        ((locked || []).length ? `<div class="row" style="gap:6px"><span class="tag-good">Bloccati:</span> ${lockChips}</div>` : '<span class="tag-warn">Nessun membro riconosciuto dall\'import.</span>') +
        (warns ? `<ul>${warns}</ul>` : '');
    }
    $('#saveBtn').disabled = teams.length === 0;
  } catch (e: any) {
    $('#genStatus').textContent = 'Errore: ' + e.message;
  }
};

$('#saveBtn').onclick = async () => {
  if (!lastTeams.length) return;
  const label = prompt('Etichetta per questo salvataggio (opzionale):') || undefined;
  $('#genStatus').textContent = 'Salvo…';
  try {
    const name = await saveTeams(currentId as string, lastTeams, label);
    $('#genStatus').textContent = `Salvato come ${name} (nel browser).`;
  } catch (e: any) {
    $('#genStatus').textContent = 'Errore: ' + e.message;
  }
};

async function loadStorico() {
  $('#savedView').innerHTML = '';
  $('#savedList').innerHTML = '<span class="muted">Carico…</span>';
  try {
    const saved = await listSavedTeams();
    if (!saved.length) { $('#savedList').innerHTML = '<span class="muted">Nessun team salvato.</span>'; return; }
    $('#savedList').innerHTML = saved.map((s) =>
      `<div class="panel row" style="justify-content:space-between"><span>${s.label ? '<strong>' + s.label + '</strong> · ' : ''}${s.name} <span class="muted">· ${s.season_id || '?'} · ${s.count} team</span></span><button onclick="viewSaved('${s.name}')">Apri</button></div>`
    ).join('');
  } catch (e: any) {
    $('#savedList').innerHTML = 'Errore: ' + e.message;
  }
}

(window as any).viewSaved = async (name: string) => {
  $('#savedView').innerHTML = '<span class="muted">Carico…</span>';
  try {
    const doc: any = await loadSavedTeam(name);
    $('#savedView').innerHTML = `<h3>${name}</h3>` + (doc.teams || []).map(teamCard).join('');
  } catch (e: any) {
    $('#savedView').innerHTML = 'Errore: ' + e.message;
  }
};
$('#refreshStorico').onclick = loadStorico;

loadSeasons().catch((e: any) => { $('#setupBody').textContent = 'Errore: ' + e.message; });
