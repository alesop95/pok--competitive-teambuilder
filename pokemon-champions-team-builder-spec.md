# Pokémon Champions Team Builder — Specifica di Handoff per Claude Code

> Documento di progettazione per un'app locale (Windows 11 / Linux) che, dato un roster di Pokémon disponibili in una stagione di Pokémon Champions, genera proposte di team competitivi con tattica, ruoli, punti di forza, debolezze e counter — seguendo la stessa logica di analisi usata manualmente nelle conversazioni precedenti.

---

## 0. Domande critiche (aggiornato con ricerca verificata)

1. **✅ RISOLTO — Sistema VP/budget.** Non è un sistema a costo per-Pokémon nella squadra. I Victory Points sono la valuta generale del gioco: servono a recuperare permanentemente un Pokémon (dopo una prova gratuita di 7 giorni) e a comprare Stat Points. **Una volta che possiedi un Pokémon, lo metti in squadra senza costi aggiuntivi.** "23/30" nello screenshot è quasi certamente la capacità del box, non un budget di squadra. **Conseguenza per lo schema dati**: il campo `budget_system` in `season_<id>.json` (§3.2) può essere rimosso o lasciato `enabled: false` di default.
2. **✅ RISOLTO — Formato di battaglia.** Doppio (VGC) confermato: Pokémon Champions è il software ufficiale VGC per i Campionati Mondiali e la Championship Series. Le ipotesi fatte finora (Amoonguss redirection, Grimmsnarl screens per due attaccanti) erano corrette.
3. **Legalità mosse/abilità/oggetti per stagione — parzialmente risolto.** Esiste già una mod community-maintained "champions" nel repository MIT di Pokémon Showdown (`data/mods/champions`), usata anche dal calcolatore ufficiale Smogon che la espone come formato selezionabile. **Da verificare in Claude Code**: se questa mod è già inclusa nel pacchetto npm `@pkmn/mods` (quello che useremo, §2.2) o se va recuperata direttamente dal repository Showdown perché troppo recente — il gioco è uscito ad aprile 2026 e il pacchetto npm potrebbe non essere ancora sincronizzato. In ogni caso, questo sostituisce gran parte del lavoro manuale previsto per `champions_overrides.json` (§3.1): si parte dalla mod esistente, non da zero.
4. **Slot squadra in game vs box.** Box ~30 slot, squadra giocabile presumibilmente 6 Pokémon con preview/pick stile VGC (4 effettivamente in campo in doppio) — da confermare il dettaglio esatto del preview, non bloccante per l'architettura.
5. **Nuovo dato emerso, non bloccante**: il sistema di statistiche non usa EV/IV tradizionali ma **Stat Points (SP)** — 66 punti totali distribuibili liberamente, massimo 32 per statistica, costo in VP per punto aggiunto. La mod "champions" di Showdown (punto 3) gestisce già questa conversione nel suo damage calc, quindi non dovremmo doverla reimplementare a mano.

Il punto 3 (dettagli fini della mod) resta da chiarire direttamente in Claude Code quando si inizia a integrare `@pkmn/dex`/`@pkmn/mods`. Non blocca più l'avvio della Fase 1.

---

## 1. Obiettivo del progetto

Costruire un'app locale, eseguibile su Windows 11 e Linux senza dipendenze cloud obbligatorie, che:

- riceve in input il roster di Pokémon disponibili (box screenshot → dati strutturati, oppure inserimento manuale/import file);
- applica conoscenza di ruoli, sinergie e meta corrente;
- genera N proposte di team competitivi, ciascuna con: composizione, ruoli, tattica di lead/mid-game, perché funziona, debolezze strutturali, counter attesi;
- viene aggiornata stagione per stagione con nuovi dati di roster e meta, senza richiedere modifiche al codice (solo ai file dati).

Non è un obiettivo iniziale: simulare combattimenti turno per turno (no battle engine completo). L'app ragiona per sinergie/coverage, non per damage calc esatto — quello può essere una fase futura (vedi §8, Fase 5).

---

## 2. Stack tecnico, repository e integrazioni (FISSATO — REVISIONATO)

### 2.1 Perché si cambia da Python a Node.js/TypeScript

**Questo è un pivot rispetto alla decisione precedente, motivato da fatti nuovi verificati.** Pokémon Showdown ([`smogon/pokemon-showdown`](https://github.com/smogon/pokemon-showdown), il motore server) è MIT e scritto in TypeScript/Node. Attorno ad esso esiste un intero ecosistema di pacchetti npm gratuiti e MIT, mantenuti dall'organizzazione [`pkmn`](https://github.com/pkmn/ps) e da Smogon stessa, pensati esplicitamente per essere usati da tool di terze parti come il nostro:

- **[`@pkmn/dex`](https://www.npmjs.com/package/@pkmn/dex)**: dati di gioco completi (specie, stats base, abilità, mosse, type chart) per le generazioni 1-9, query-friendly.
- **[`@smogon/calc`](https://www.npmjs.com/package/@smogon/calc)** (repository: [`smogon/damage-calc`](https://github.com/smogon/damage-calc)): il motore di damage calc usato dal calcolatore ufficiale Smogon ([calc.pokemonshowdown.com](https://calc.pokemonshowdown.com/)) — implementa la formula esatta del danno per ogni generazione, e ha già "Champions" come formato selezionabile. Non ha senso reimplementarlo a mano: è già testato su milioni di calcoli reali.
- **[`@smogon/sets`](https://www.npmjs.com/package/@smogon/sets)**: set "standard" derivati dalle usage stats di Pokémon Showdown, aggiornati mensilmente.
- **[`@pkmn/sets`](https://www.npmjs.com/package/@pkmn/sets)**: serializzazione/deserializzazione di team in formato testo (utile per import/export).
- **[`@pkmn/mods`](https://www.npmjs.com/package/@pkmn/mods)**: estrazione delle mod non-canoniche di Showdown (incluso, presumibilmente, `champions` — da verificare, §0 punto 3) per usarle con `@pkmn/dex`/`@pkmn/sim`.
- **[`@pkmn/dmg`](https://github.com/pkmn/dmg)**: successore "spirituale" di `@smogon/calc`, pensato nativamente per l'ecosistema `@pkmn` — alternativa da valutare in Fase 0 se offre un'integrazione più diretta con `@pkmn/dex`/`@pkmn/mods` rispetto a `@smogon/calc`.

La mod Champions specifica, già pronta nel repository di Showdown, è qui: [`smogon/pokemon-showdown/tree/master/data/mods/champions`](https://github.com/smogon/pokemon-showdown/tree/master/data/mods/champions).

Tutto questo è nativo TypeScript. Usarlo da Python richiederebbe un ponte permanente (sottoprocesso Node, o un microservizio HTTP separato solo per i calcoli) — un costo ricorrente per ogni chiamata, non un costo one-time. Passare l'intero backend a Node/TypeScript elimina il ponte e si sposa meglio anche con l'obiettivo "eventualmente app web", dato che Node è lo standard de facto per backend web leggeri e deployabili gratuitamente (§2.5).

**Nota importante sulla "Pokémon Showdown CLIENT"**: esiste un repository separato ([`smogon/pokemon-showdown-client`](https://github.com/smogon/pokemon-showdown-client)) con licenza AGPLv3, diversa da quella del server — non ci serve, noi non usiamo la loro UI, solo il motore dati/calcolo lato server che resta MIT.

### 2.2 Stack applicativo finale — tutto gratuito e open source

| Componente | Scelta | Licenza | Perché |
|---|---|---|---|
| Runtime | [Node.js](https://nodejs.org/) 20+ LTS | OpenJS (libera) | Cross-platform nativo, nessun costo |
| Linguaggio | [TypeScript](https://www.typescriptlang.org/) | Apache 2.0 (compilatore) | Tipizzazione, stesso linguaggio dei dati di gioco |
| Web server | [Fastify](https://fastify.dev/) | MIT | Leggero, veloce, buon supporto TS |
| Dati di gioco + type chart | [`@pkmn/dex`](https://www.npmjs.com/package/@pkmn/dex) | MIT | Stats, abilità, movepool, type chart — niente da importare a mano |
| Damage calc | [`@smogon/calc`](https://www.npmjs.com/package/@smogon/calc) | MIT | Formula danno reale, generazioni 1-9 |
| Set di riferimento (opzionale) | [`@smogon/sets`](https://www.npmjs.com/package/@smogon/sets) | MIT | Set standard da usage stats — **attenzione**: riflette il meta dei tier Showdown (OU ecc.), non quello di Pokémon Champions; utile solo come riferimento generico, non come fonte di verità per il meta Champions (resta `data/seasons/*_meta.yaml`, curato a mano) |
| Storage | file JSON/YAML (vedi nota sotto) | — | Per l'MVP non serve un vero DB |
| Frontend | HTML/CSS/JS vanilla | — | Nessun cambiamento rispetto a prima |
| Test | [Vitest](https://vitest.dev/) | MIT | Standard moderno per TS, rapido |
| Gestione dipendenze | npm + `package.json` | — | Gli script npm sono già identici su Windows/Linux: niente più `run.sh`/`run.bat` separati |

**Nota storage**: con i dati di gioco forniti da `@pkmn/dex` (niente più import/cache da gestire) e lo storico generazioni già pensato come file JSON (§2.4), un vero database **non serve più nemmeno per l'MVP**. Si introduce SQLite (via [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3), MIT) solo se in futuro servirà interrogare lo storico in modi che i file flat non supportano bene.

**Packaging futuro (Fase 5, non bloccante):** [Tauri](https://tauri.app/) per un'app desktop vera, oppure semplicemente Node eseguito direttamente — entrambi gratuiti.

### 2.3 Versionamento — repository Git e GitHub personale

- **Locale**: `git init` nella root. Gratuito, nessuna dipendenza esterna.
- **GitHub personale — pubblico o privato?** Con l'account Free di GitHub: repo pubblici illimitati con feature complete, repo privati illimitati ma con feature limitate, 2.000 minuti/mese di GitHub Actions gratis su entrambi. La differenza pratica per noi: **GitHub Pages gratuito funziona solo su repo pubblici** (su repo privati richiede il piano Pro). Dato che il codice non contiene dati sensibili — solo logica di team building e strategie Pokémon — un **repo pubblico** è la scelta più semplice se in futuro vuoi sfruttare Pages per il frontend gratis. Se preferisci comunque la privacy del repo (è un progetto hobby, può avere senso), nessun problema: si rinuncia solo a Pages gratuito, il resto dello stack resta identico.
- **Tag di stagione**: a ogni chiusura di stagione, `git tag season-MB` sul commit corrispondente.
- **Licenza repo**: MIT di default.

**`.gitignore`:**
```
node_modules/
dist/
.env
*.log
```

`package-lock.json` va **tracciato** (garantisce build riproducibili). Come prima, i dati di roster e meta (`data/seasons/*.json`, `*.yaml`) restano tracciati perché sono la conoscenza curata che evolve stagione per stagione.

### 2.4 Storico dei team generati
Confermato dalla revisione precedente: un file JSON timestampato per generazione in `data/generated_teams/`, diffabile e leggibile nei commit.

### 2.5 Eventuale hosting web (verificato a giugno 2026)

Se in futuro l'app smette di essere solo locale:

- **Frontend statico**: GitHub Pages (gratis, se repo pubblico) o Cloudflare Pages (gratis indipendentemente dalla visibilità del repo).
- **Backend/API**: **Render** è oggi l'opzione con un free tier reale senza carta di credito richiesta — limite noto: il servizio si "addormenta" dopo 15 minuti di inattività e il primo accesso successivo richiede 30-50 secondi per risvegliarsi. Per un tool ad uso personale/hobby è perfettamente accettabile.
- **Railway e Fly.io NON sono più opzioni "sempre gratis"** dal 2026: richiedono carta di credito e offrono solo crediti di prova a tempo — esclusi per questo motivo.
- **Alternativa più elegante data la natura dell'app**: dato che ogni richiesta della nostra API è stateless (dato un roster + meta, restituisci dei team — nessuna sessione da mantenere), **Cloudflare Workers** (gratis, nessun cold-start percepibile) è candidato forte in alternativa a Render, perché il nostro caso d'uso è esattamente quello per cui le funzioni serverless sono pensate.
- Nota tecnica se si arriva a quel punto: su un runtime edge come Cloudflare Workers non esiste un filesystem persistente, quindi `better-sqlite3` o i file flat locali andrebbero sostituiti con uno storage compatibile (es. Cloudflare D1 o Turso, entrambi SQLite-compatibili e con tier gratuito). Non è un problema ora: per l'app locale i file flat bastano, questo si affronta solo se/quando si decide di rendere l'app davvero pubblica sul web.

---

## 3. Modello dati

Tre famiglie di dati, separate per poter aggiornare la stagione senza toccare il codice:

### 3.1 Dati base Pokémon
Specie, tipi, statistiche base, abilità disponibili, movepool, type chart. Arrivano da `@pkmn/dex` (§2.1-2.2). **Aggiornamento importante**: esiste già una mod "champions" community-maintained nel repository MIT di Pokémon Showdown (`data/mods/champions`), usata anche dal calcolatore ufficiale Smogon — verificare in Claude Code se è già raggiungibile tramite `@pkmn/mods` o se va importata direttamente dal repository. Questa mod copre presumibilmente già gran parte delle differenze Champions (incluso il sistema Stat Points, §0 punto 5). Il file `champions_overrides.json` resta utile solo per le eventuali eccezioni residue non coperte dalla mod, non più come layer primario:

```json
// data/champions_overrides.json
{
  "Aggron": {
    "banned_abilities": [],
    "banned_moves": [],
    "notes": "Mega Aggron disponibile solo se Mega Stone abilitate nel formato"
  }
}
```

### 3.2 Roster di stagione (`data/seasons/season_<id>.json`)
Cosa fornirà Alessio ogni stagione, derivato dagli screenshot del box + lista roster M-B:

```json
{
  "season_id": "M-B",
  "format": "doubles",          // da confermare punto 0.2
  "budget_system": {
    "enabled": true,             // da confermare punto 0.1
    "total_budget": null,        // es. 30 slot o 1472 VP — da chiarire
    "unit": "VP"
  },
  "available_pokemon": [
    {
      "species": "Grimmsnarl",
      "cost": null,               // se budget_system.enabled
      "held_item_hint": null,
      "source": "M-B roster list"
    }
  ]
}
```

### 3.3 Meta corrente (`data/seasons/season_<id>_meta.yaml`)
**Questa è la parte che NON si trova su un'API: va curata a mano da Alessio e aggiornata a ogni cambio di stagione.** Struttura proposta:

```yaml
season_id: M-B
top_threats:
  - species: Garganacl
    role_tags: [wall, status_immune]
    why_relevant: "Immune a Spore (Purifying Salt), bulk altissimo, hard counter a setup fisici"
  - species: Incineroar
    role_tags: [redirection_counter, intimidate]
    why_relevant: "Fake Out + Intimidate spezza i lead di setup/support"
common_cores:
  - members: [Grimmsnarl, Dragonite]
    archetype: screens_sweep
speed_benchmarks:
  - tier: "fast offense"
    min_speed_after_items: 110
notes_freeform: |
  Eventuali osservazioni qualitative su trend di team building osservati.
```

### 3.4 Output generato (storico, `data/generated_teams/*.json`)
Ogni team generato viene salvato in un file JSON timestampato con roster/season di riferimento e feedback opzionale di Alessio (utile in futuro per pesare meglio l'algoritmo). Vedi §2.4.

---

## 4. Motore di analisi (cuore della logica)

### 4.1 Tagging dei ruoli (regole deterministiche)
Per ogni Pokémon nel roster, assegna tag multipli in base a stats/ability/movepool disponibile:

| Tag | Regola |
|---|---|
| `screens_setter` | ability Prankster + movepool include Reflect o Light Screen |
| `trick_room_setter` | base speed ≤ 60 e movepool include Trick Room |
| `trick_room_abuser` | base speed ≤ 60 e Attack o SpAtk base ≥ 100 |
| `autonomous_sweeper` | ability in {Speed Boost, Moxie, Contrary, Beast Boost} + mossa di setup o danno coerente |
| `redirection_support` | movepool include Follow Me o Rage Powder |
| `pivot` | movepool include U-turn/Volt Switch/Flip Turn + ability Regenerator opzionale (bonus) |
| `weather_setter` | ability in {Drought, Drizzle, Sand Stream, Snow Warning} |
| `speed_control` | movepool include Tailwind/Icy Wind/Electroweb, o è trick_room_setter |
| `wallbreaker` | Attack o SpAtk base ≥ 110, accesso a Choice item, recovery limitato |
| `priority_closer` | movepool include mossa priority ≥ +1 con buon BP |

Questi tag sono gli stessi che ho usato manualmente nell'analisi precedente — l'obiettivo è renderli espliciti e riusabili dal codice.

### 4.2 Generazione candidati team
1. Identifica **archetipi disponibili** nel roster corrente incrociando i tag (es: se esiste almeno un `screens_setter` + almeno due `autonomous_sweeper`/`trick_room_abuser`, l'archetipo "screens offense" è disponibile).
2. Per ogni archetipo disponibile, costruisci un **core** (2-3 Pokémon) e poi riempi gli slot rimanenti massimizzando:
   - copertura difensiva (minimizzare debolezze condivise, specialmente verso `top_threats` del meta file);
   - copertura offensiva (almeno una risposta a ciascun `top_threats` rilevante: resist, immunità, o priority che lo elimina prima che agisca);
   - assenza di ridondanza inutile (es. non 3 Pokémon Fire senza motivo).
3. Punteggio finale per team = somma pesata di: forza sinergia core, coverage difensiva, coverage offensiva contro meta threats, penalità per buchi noti (es. nessuna risposta a Fairy).
4. Ritorna i top 3-5 team per punteggio.

### 4.3 Generazione del testo di rationale
Due livelli, attivabili in configurazione:

- **Livello 1 (sempre disponibile, offline, deterministico)**: template testuali che combinano i fatti strutturati (tag, type coverage calcolato, meta threats coperti/non coperti) in frasi leggibili. Niente AI, funziona sempre, zero costi.
- **Livello 2 (opzionale, richiede `ANTHROPIC_API_KEY` e connessione)**: i fatti strutturati del Livello 1 vengono passati come contesto a una chiamata API (`claude-sonnet-4-6` o modello equivalente disponibile, via SDK `@anthropic-ai/sdk` per Node) con un prompt che richiede di scrivere l'analisi in prosa fluida, nello stile già mostrato nelle conversazioni precedenti (tattica, perché funziona, debolezze, counter). Questo livello produce testo più naturale ma introduce dipendenza da rete/costo per chiamata — va trattato come enhancement, non come requisito MVP.

---

## 5. Interfaccia utente (web locale)

Pagine minime per l'MVP con UI:

1. **Setup stagione**: seleziona/crea file roster + file meta per la stagione corrente.
2. **Editor meta**: form semplice (o editor testo grezzo del YAML) per aggiornare `top_threats` e `common_cores` quando cambia la stagione.
3. **Genera team**: bottone unico → lista di card, una per team proposto, espandibili con tattica/debolezze/counter.
4. **Dettaglio/esporta**: copia il team in formato testo semplice (utile per riportarlo a mano nell'app di gioco, dato che non esiste API ufficiale per importare team in Champions).

Nessun requisito di design elaborato per l'MVP: funzionale prima di tutto.

---

## 6. Struttura del progetto

```
pokemon-champions-builder/
├── .git/
├── .gitignore
├── LICENSE                      # MIT (default, §2.3)
├── README.md
├── package.json
├── package-lock.json            # tracciato: build riproducibili
├── tsconfig.json
├── src/
│   ├── server.ts                # entrypoint Fastify
│   ├── pkmnData.ts              # wrapper su @pkmn/dex + @smogon/calc
│   ├── roleTagging.ts           # logica §4.1
│   ├── teamGenerator.ts         # logica §4.2
│   ├── rationale.ts             # logica §4.3 (livello 1 + hook livello 2)
│   └── public/                  # frontend statico servito da Fastify
├── tests/
│   └── roleTagging.test.ts      # Vitest, da popolare in Fase 1
├── data/
│   ├── champions_overrides.json # tracciato (curato)
│   ├── seasons/
│   │   ├── season_MB.json       # tracciato (curato)
│   │   └── season_MB_meta.yaml  # tracciato (curato)
│   └── generated_teams/
│       └── 2026-06-19_153000.json  # un file per generazione, tracciato/diffabile
└── scripts/
    └── refresh_meta_sets.ts     # opzionale: aggiorna riferimento da @smogon/sets
```

`package.json` — dipendenze indicative (Fase 0):
```json
{
  "dependencies": {
    "fastify": "^5.0.0",
    "@pkmn/dex": "^0.9.0",
    "@smogon/calc": "^0.11.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^2.0.0",
    "tsx": "^4.0.0"
  },
  "scripts": {
    "dev": "tsx src/server.ts",
    "test": "vitest run"
  }
}
```

Avvio identico su Windows e Linux: `npm install` poi `npm run dev` — niente più script `.sh`/`.bat` separati, npm già normalizza questo.

---

## 7. Roadmap di sviluppo

| Fase | Contenuto | Output |
|---|---|---|
| 0 | Chiarire le 4 domande critiche (§0); inizializzare repo, `npm init`, installare `@pkmn/dex` e `@smogon/calc` | Decisioni documentate, schema dati finalizzato, progetto avviabile |
| 1 | Motore offline da CLI: tagging + generazione team su un singolo roster, output Markdown su file | Script funzionante, niente UI |
| 2 | Wrapping in Fastify + UI minima (le 4 pagine di §5) | App locale utilizzabile via browser |
| 3 | Raffinamento algoritmo: scoring sinergia, validazione coverage contro meta threats (anche con damage calc reale via `@smogon/calc`), più archetipi | Qualità output comparabile alle analisi manuali, con numeri di danno verificati |
| 4 | Integrazione opzionale Livello 2 (rationale via API Claude) | Testo più naturale, attivabile/disattivabile |
| 5 (opzionale) | Packaging come app desktop (Tauri), oppure deploy web (§2.5) | Doppio click locale, o URL pubblico |

**Criterio di successo per l'MVP (fine Fase 2)**: dato il roster M-B fornito, l'app produce almeno 3 team distinti con qualità di analisi comparabile a quella prodotta manualmente in questa conversazione, in meno di un secondo (Livello 1, nessuna chiamata di rete).

---

## 8. Note per l'aggiornamento stagionale

A ogni nuova stagione, il lavoro di Alessio si riduce a:
1. aggiornare `data/seasons/season_<nuovo_id>.json` con il nuovo roster (da screenshot box + lista);
2. aggiornare `data/seasons/season_<nuovo_id>_meta.yaml` con le minacce/archetipi osservati nel meta corrente;
3. nessuna modifica al codice richiesta, salvo nuove ability/meccaniche mai viste prima che richiedano un nuovo tag in §4.1.

---

## 9. Riferimenti e link (consolidato)

Tutti i link citati nel documento, in un unico posto. Quando si avvia la Fase 0 in Claude Code, partire da qui per installare le dipendenze corrette senza indovinare nomi di pacchetto.

### 9.1 Codice open source da installare (dipendenze npm dirette)

| Pacchetto | Link npm | Repository | Licenza |
|---|---|---|---|
| `@pkmn/dex` | https://www.npmjs.com/package/@pkmn/dex | https://github.com/pkmn/ps | MIT |
| `@smogon/calc` | https://www.npmjs.com/package/@smogon/calc | https://github.com/smogon/damage-calc | MIT |
| `@pkmn/sets` | https://www.npmjs.com/package/@pkmn/sets | https://github.com/pkmn/ps | MIT |
| `@pkmn/mods` | https://www.npmjs.com/package/@pkmn/mods | https://github.com/pkmn/ps | MIT |
| `@smogon/sets` | https://www.npmjs.com/package/@smogon/sets | https://github.com/smogon/damage-calc | MIT |
| Fastify | https://www.npmjs.com/package/fastify | https://github.com/fastify/fastify | MIT |
| Vitest | https://www.npmjs.com/package/vitest | https://github.com/vitest-dev/vitest | MIT |
| better-sqlite3 (solo se serve, §2.2) | https://www.npmjs.com/package/better-sqlite3 | https://github.com/WiseLibs/better-sqlite3 | MIT |

### 9.2 Codice open source da consultare (non da installare, ma da cui derivano i dati/la logica)

| Cosa | Link | Licenza | Perché ci serve |
|---|---|---|---|
| Pokémon Showdown (server) | https://github.com/smogon/pokemon-showdown | MIT | Motore originale da cui derivano tutti i pacchetti `@pkmn`/`@smogon` |
| Mod "champions" dentro Showdown | https://github.com/smogon/pokemon-showdown/tree/master/data/mods/champions | MIT | Dati/regole specifiche di Pokémon Champions già curate dalla community (§0 punto 3) |
| `@pkmn/dmg` (alternativa a `@smogon/calc`) | https://github.com/pkmn/dmg | MIT | Successore più moderno del damage calc, da valutare in Fase 0 |
| Pokémon Showdown client | https://github.com/smogon/pokemon-showdown-client | AGPLv3 — **non usato** | Solo per chiarezza: licenza diversa dal server, non ci serve |
| Calcolatore ufficiale Smogon (per verifiche manuali) | https://calc.pokemonshowdown.com/ | — | Per controllare a mano i numeri che il nostro motore produce |
| Thread Smogon sul formato "Champions DOU" | https://www.smogon.com/forums/threads/champions-dou.3781993/ | — | Conferma che esiste un ladder community per Champions su Showdown stesso |

### 9.3 Tool della community — gratuiti ma a codice chiuso (solo come riferimento/cross-check, NON dipendenze del progetto)

| Tool | Link | Cosa offre |
|---|---|---|
| Pikalytics — Champions Team Builder | https://www.pikalytics.com/team | Set da usage stats reali dei torneo |
| ChampTeams.gg | https://champteams.gg/ | Builder + damage calc + tier list per Reg M-B |
| VGC.tools | https://vgc.tools/ | Builder + libreria team della community |
| Champions Builder | https://www.championsbuilder.com/ | Builder + damage calc + export Showdown |
| Champions Lab | https://championslab.xyz/team-builder | Builder + meta analysis |
| PokéBase — Team Builder Champions | https://pokebase.app/pokemon-champions/team-builder | Builder con filtri di regolamento |
| Game8 — Team Builder / Damage Calc | https://game8.co/games/Pokemon-Champions/archives/Builder · https://game8.co/games/Pokemon-Champions/archives/Damage-Calc | Builder + calc, dati Champions |
| VGC Multi Calc | https://vgcmulticalc.com/ | Damage calc multi-target |

### 9.4 Fonti ufficiali

| Fonte | Link |
|---|---|
| Pagina ufficiale gameplay Pokémon Champions | https://champions.pokemon.com/en-us/gameplay/ |

### 9.5 Documentazione hosting/GitHub (per §2.3 e §2.5)

| Argomento | Link |
|---|---|
| Piani GitHub (free/Pro, limiti Pages/Actions) | https://docs.github.com/get-started/learning-about-github/githubs-products |
| Limiti GitHub Pages | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits |
| Stato free tier hosting 2026 (Render, verificato) | https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026 |
