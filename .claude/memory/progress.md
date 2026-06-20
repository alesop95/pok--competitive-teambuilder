# Work-log

> Append-only, in ordine cronologico inverso (la voce più recente in alto). Ogni passo
> significativo di codice e ogni intervento manuale rilevante lascia una voce con data, file
> toccati, motivo e commit di riferimento. Qui confluisce anche il log di riconciliazione dei
> documenti `.docx`, con il nome del documento sorgente e l'esito, così la data di allineamento
> sopravvive a un clone.

## 2026-06-20 — Fase 1 completata: generazione team, rationale L1 e CLI

Commit: (da committare)
File toccati: `src/teamGenerator.ts`, `src/rationale.ts`, `src/pkmnData.ts` (+`buildCandidates`,
`getThreatTypes`, mappa difensiva), `scripts/generate.ts`, `tests/teamGenerator.test.ts`,
`package.json` (script `roster`, `generate`), `.claude/context/current-work.md`.
Motivo: implementato il generatore §4.2 (modulo puro: rilevamento archetipi da tag, costruzione
core, riempimento greedy con coverage difensiva via type chart di @pkmn/dex e tiebreak sui ruoli,
scoring con penalità per debolezze impilate e per minacce meta non coperte) e il rationale §4.3
Livello 1 (testo Markdown deterministico). La CLI `scripts/generate.ts` lega la pipeline: legge
`season_MB.json`, tagga le 208 specie base, genera i top 5 team, scrive report `.md` + `.json`
timestampati in `data/generated_teams/`. Esecuzione end-to-end in ~2s. Test: 19/19 verdi (unit su
fixture + integrazione reale), typecheck pulito. Limiti noti documentati in `current-work.md`
(scoring piatto senza meta curato, no damage calc reale: Fase 3). Prossimo: Fase 2 (UI web minima)
o curatela di `season_MB_meta.yaml` per alzare la qualità dello scoring.

## 2026-06-20 — Fase 1: regolamento M-B, roster e tagging dei ruoli

Commit: (da committare)
File toccati: `data/seasons/season_MB.json`, `scripts/fetch_roster.ts`, `src/roleTagging.ts`,
`src/pkmnData.ts`, `tests/roleTagging.test.ts`, `tests/pkmnData.test.ts`,
`.claude/context/current-work.md`.
Motivo: ricerca web delle regole ufficiali di Regulation M-B (doppio, squadra 4-6 a Lv50, Species
e Item Clause, una sola Megaevoluzione per battaglia, nessun Pokémon specifico restritto, Mega
Lucario Z e Mega Garchomp Z non possono Megaevolvere; +22 Pokémon e +16 Mega rispetto a M-A;
nuovi item Life Orb/Wide Lens/Light Clay; periodo 17 giu → 2 set 2026). Dati versionati in
`season_MB.json` con le fonti (serebii, game8, pokemon-zone, sportskeeda, bulbagarden). Scritto lo
scraper deterministico `scripts/fetch_roster.ts` che popola `available_pokemon` da serebii: 283
forme, 208 specie base. Implementato il tagging dei ruoli §4.1 (`roleTagging.ts`, modulo puro) con
wrapper `getTaggingInput`/`tagSpecies` in `pkmnData.ts` che legge movepool e metadati mossa dalla
dex champions. Test: 14/14 verdi (10 unit su fixture + integrazione reale Grimmsnarl=screens_setter,
Amoonguss=redirection_support), typecheck pulito. Prossimo: `teamGenerator.ts` (§4.2).

## 2026-06-20 — Fase 1: integrazione data layer (mod champions) verificata

Commit: (da committare)
File toccati: `package.json` (+`@pkmn/mods`), `src/pkmnData.ts`, `src/pkmn-mods.d.ts`,
`tests/pkmnData.test.ts`, `tsconfig.json`, `.claude/memory/decisions.md`,
`.claude/context/current-work.md`.
Motivo: chiuse ADR-005 (mod `champions` raggiungibile via `@pkmn/mods@0.10.11`, verificato) e
ADR-007 (fonte dati = mod champions + serebii cross-check; regolamento target Reg M-B, in vigore
17 giu → 2 set 2026 UTC; `championsregma` del README è confermato Reg M-A). Implementato
`pkmnData.ts` che carica `@pkmn/dex` con la mod `champions` (`Dex.mod('champions', import(...))`) e
interroga le specie; risolto TS7016 sui subpath di `@pkmn/mods` con dichiarazioni ambient in
`src/pkmn-mods.d.ts`. Verifica: dex champions con 1427 voci specie; query reali corrette
(Incineroar Fire/Dark + Intimidate, Garganacl Purifying Salt, Grimmsnarl Prankster). Tradotto in
test Vitest (`tests/pkmnData.test.ts`, 3 casi verdi). Typecheck pulito, suite 4/4 verde.
Prossimo: generare `data/seasons/season_MB.json` (lista M-B da serebii) e implementare il tagging
dei ruoli §4.1.

## 2026-06-19 — Primo ancoraggio post-init (sync-context)

Commit: 373419b
File toccati: le 6 schede di `context/` (`STACK`, `design-and-security`, `deployment`,
`dev-testing`, `current-work`, `roadmap`), `memory/index.md`, `memory/progress.md`.
Motivo: eseguito il primo commit manuale (`373419b — Initial commit: sistema di progetto +
scaffold Fase 0`). La skill `sync-context` ha sostituito il segnaposto `PENDING-FIRST-COMMIT` con
l'hash di HEAD in `generated-from-commit` e `last-verified-commit` di tutte le schede e nel commit
di riferimento di `memory/index.md`. Da qui in poi il drift si misura normalmente rispetto a HEAD.

## 2026-06-19 — Avvio Fase 0 dell'handoff: scaffold Node/TS

Commit: 373419b
File toccati: `LICENSE`, `package.json`, `tsconfig.json`, `src/**`, `tests/**`, `data/**`,
`scripts/**`, `README.md`.
Motivo: eseguita la Fase 0 della roadmap dell'handoff (`pokemon-champions-team-builder-spec.md`
§7). Creato lo scaffold del backend Node.js/TypeScript con Fastify, stub dei moduli del motore di
analisi (`pkmnData`, `roleTagging`, `teamGenerator`, `rationale`) e struttura dati a file
(`data/seasons`, `data/generated_teams`). Schema dati e link open source documentati in
`context/STACK.md`. Dettagli fini della logica rinviati alla Fase 1.

## 2026-06-19 — Inizializzazione del sistema di progetto

Commit: 373419b
File toccati: anatomia di `.claude` (`settings.json`, `memory/`, `context/`, `skills/`,
`commands/`, `agents/`), `CLAUDE.md`, `.gitignore`, `_notes/`, `tools/`.
Motivo: installazione del sistema portabile di contesto, documentazione e version control
descritto in `.claude/PROJECT-SYSTEM.md`, eseguendo la procedura della sezione 10 sul progetto
greenfield. Identità git già configurata localmente (`alesop95`, remoto `github-personal`).
Igiene account verificata in sola lettura: PASS (`autoMemoryEnabled: false`, hook `SessionEnd` di
wipe presente). Schede di `context/` create con frontmatter ancorato a `373419b`;
`STACK.md`, `roadmap.md`, `current-work.md` popolate con le decisioni già fissate nell'handoff.
Copiate dal bundle di riferimento le skill-motore `init-project-system`, `sync-context`,
`git-sync`, `repo-status`, `onboard`.
