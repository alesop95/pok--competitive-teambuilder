# Work-log

> Append-only, in ordine cronologico inverso (la voce più recente in alto). Ogni passo
> significativo di codice e ogni intervento manuale rilevante lascia una voce con data, file
> toccati, motivo e commit di riferimento. Qui confluisce anche il log di riconciliazione dei
> documenti `.docx`, con il nome del documento sorgente e l'esito, così la data di allineamento
> sopravvive a un clone.

## 2026-06-22 — sync-context: ri-ancoraggio schede a HEAD 17fdd2a

Commit: 17fdd2a
File toccati: le 6 schede di `context/` (frontmatter `last-verified-commit` → 17fdd2a),
`design-and-security.md` e `dev-testing.md` (delta update di contenuto), `memory/index.md`.
Motivo: dopo il commit `17fdd2a` (motore Fase 3 → documentazione), eseguito `sync-context`. Tutte le
`covers-paths` risultavano cambiate dal precedente ancoraggio (373419b). Le schede mantenute durante
la sessione (STACK, deployment, current-work, roadmap) erano già allineate nel contenuto: solo bump
del `last-verified`. Le schede `design-and-security` e `dev-testing` erano indietro e hanno ricevuto
un delta update mirato (pipeline con viability/damage calc/legalità; suite reale a 29 test su 6
file). Snapshot di `index.md` portato a 17fdd2a.

## 2026-06-22 — Rifinitura motore, prep deploy (Fase 5) e documentazione tecnica

Commit: (da committare)
File toccati: `src/roleTagging.ts` (speed_control distinto da Trick Room), `src/teamGenerator.ts`
(baseStats su Candidate, TR nella sinergia), `src/pkmnData.ts` (baseStats nei candidati),
`src/engine.ts` (viability con stazza, contesto Trick Room ai set), `src/setBuilder.ts` (natura/SP
da contesto team), `package.json` (`start`), `render.yaml` (nuovo), `docs/TECHNICAL.md` (nuovo),
`README.md`, schede context.
Motivo: (1) Rifinitura motore: viability ora include la stazza (PS+Dif+DifSpec) e pesa meno l'offesa
grezza, così attaccanti fragili (es. Pyroar) non dominano; il tag speed_control non include più
Trick Room, evitando TR setter nei team Tailwind; natura e Stat Points dei set dipendono dal
contesto del team (Brave/Quiet solo nei team Trick Room). Verificato: nature TR solo nel team TR,
diversità realistica. (2) Fase 5: `npm start` + `render.yaml` per deploy web gratuito su Render
(HOST 0.0.0.0, PORT da env); Tauri desktop resta alternativa futura. (3) Documentazione tecnica
completa in `docs/TECHNICAL.md`: stack, tool open source con licenze, e la matematica del motore
(efficacia di tipo, tagging, damage calc, viability, scoring, set, legalità) con riferimenti
percorso:simbolo. 29/29 test verdi, typecheck pulito.

## 2026-06-22 — Salvataggio/storico team e legalità di formato (cross-check serebii)

Commit: (da committare)
File toccati: `src/engine.ts` (save/list/load team, loadLegality/validateSet), `src/server.ts`
(rotte save/saved), `src/public/index.html` (tab Storico, bottone Salva), `scripts/fetch_legality.ts`
(nuovo), `data/seasons/legal_MB.json` (nuovo), `tests/legality.test.ts`, `package.json` (script
`legality`). Completate le altre due feature scelte.
Salvataggio/storico (handoff §2.4/§3.4/§5): POST `/api/season/:id/save` scrive un JSON timestampato
in data/generated_teams/, `/api/saved` elenca, `/api/saved/:name` apre (nome validato contro path
traversal); UI con tab Storico e bottone "Salva proposte". Legalità: `scripts/fetch_legality.ts`
scrappa serebii items+moves in `data/seasons/legal_MB.json` (181 strumenti, 499 mosse); l'engine
valida i set e sostituisce gli strumenti non disponibili segnalandoli. Scoperta utile: Safety
Goggles NON è legale in M-B — era usato dai set di redirezione, corretto alla radice (Sitrus Berry)
con il validatore come rete di sicurezza. Verifica: 28/28 test verdi, typecheck pulito, CLI senza
item illegali. Restano: rifinitura finale + documentazione tecnica completa (richiesta dall'utente).

## 2026-06-20 — Migliorie set + selezione guidata da viability (qualità)

Commit: (da committare)
File toccati: `src/setBuilder.ts` (Mega, abilità competitive incl. hidden, filtro mosse poco
pratiche condiviso), `src/calc.ts` (usa il filtro condiviso), `src/teamGenerator.ts` (viability,
diversità, common_cores), `src/pkmnData.ts` (`getMegaForme`, bst/viability su Candidate),
`src/engine.ts` (`computeViability`, mega per team, cores), `src/public/index.html`, test.
Motivo: (1) tre migliorie set richieste dall'utente: forme Mega (una per team, Mega Stone +
statline Mega), abilità competitive anche hidden (es. Lightning Rod), filtro mosse impratiche in
doppio (Focus Punch ecc.) condiviso tra set e calc. (2) Su segnalazione utente (Slowbro/Pikachu in
ogni team), diagnosticato e corretto il difetto di selezione: confermato che fonti dati e
calcolatore (`@smogon/calc` ufficiale Smogon, `@pkmn/dex`+mod champions) sono corretti; il problema
era l'euristica greedy che premiava versatilità e difesa grezza. Introdotta la viability competitiva
(ADR-008): pressione offensiva reale sul meta via damage calc + copertura difensiva + BST, che guida
core e riempimento, con penalità di diversità; i common_cores del meta seedano proposte. Risultato:
prima Pikachu/Raichu/Slowbro/Ariados in 5/5 team; ora team diversi con Sneasler, Incineroar,
Hydreigon, Kingambit, Corviknight, Skarmory, Volcarona, Staraptor… generazione ~0.8s. 26/26 test
verdi, typecheck pulito. Restano da fare le altre 2 feature scelte (salvataggio/storico UI, legalità
M-B cross-check serebii) e la rifinitura finale (viability sovrastima attaccanti fragili).

## 2026-06-20 — Set competitivi completi (item, abilità, natura, Stat Points, mosse)

Commit: (da committare)
File toccati: `src/setBuilder.ts` (nuovo), `src/engine.ts` (sets per membro), `src/rationale.ts`
(sezione set), `src/public/index.html` (card + export), `tests/setBuilder.test.ts`.
Motivo: su richiesta utente, le proposte ora includono il set completo di ogni Pokémon. Deciso col
gate: sistema statistiche = Stat Points di Champions (66 totali, max 32/stat, §0.5), non EV/IV; set
completo con 4 mosse. `src/setBuilder.ts` (euristiche deterministiche): abilità per preferenza
competitiva, strumento per ruolo (Light Clay schermi, Life Orb breaker/sweeper, Safety Goggles
redirezione, Sitrus default), natura per orientamento/ruolo (Adamant/Modest, Brave/Quiet in TR,
Impish/Calm supporto), spread SP (due stat a 32 + resto), 4 mosse (STAB + coverage + mossa di ruolo
+ Protect). Agganciato all'engine (`sets` per team), al rationale e alla UI (sezione Set completi +
export testuale). Verifica: typecheck pulito, 24/24 test verdi, CLI e API mostrano i set
(es. Slowbro @ Sitrus · Regenerator · Quiet · SPA32/HP32 · Hydro Pump/Psychic/Trick Room/Protect).
Limiti: scelte euristiche (talvolta mosse subottimali come Focus Punch in doppio, abilità non
ideale se l'unica utile è hidden); raffinabili. Resa UI da verificare con screenshot.

## 2026-06-20 — Fase 3: damage calc reale e raffinamento motore

Commit: (da committare)
File toccati: `src/calc.ts` (nuovo), `src/engine.ts` (post-pass coverage offensiva),
`src/teamGenerator.ts` (archetipo weather + bonus sinergia), `src/rationale.ts` (sezione coverage
offensiva), `src/pkmnData.ts` (`getDefenseMap` esportata), `src/public/index.html` (render
coverage), `tests/calc.test.ts`, `package.json` (+`@pkmn/data`).
Motivo: integrato il damage calc reale del formato Champions. De-risk: `@smogon/calc` funziona con
una `Generation` di `@pkmn/data` costruita sulla dex moddata `champions` (predicato `exists`
permissivo per non perdere specie isNonstandard come Mawile). `src/calc.ts`: gen singleton +
`bestDamagePercent(att, dif)` che sceglie la mossa migliore (bp × STAB × efficacia × stat offensiva
reale, scartando mosse a due turni/ricarica/differite e <80 precisione) e ritorna la % di danno a
Lv50 con spread standard; risultati memoizzati. Engine: post-pass che per ogni team calcola la
risposta offensiva migliore a ciascuna minaccia meta (≥50% = risposta solida), aggiunge il punteggio
e riordina; il rationale espone i numeri reali (es. Incineroar <- Blastoise/Water Spout/96%).
Generator: archetipo Weather Offense e bonus di sinergia per ruoli di supporto. Verifica:
typecheck pulito, 21/21 test verdi, CLI e API ~2s, coverage 10/10 minacce. UI aggiornata con la
sezione coverage offensiva (resa da verificare con screenshot). Nota: durante il riavvio del server
ho dovuto terminare il processo node rimasto appeso sulla 5187 (TaskStop non uccide il nipote);
la 3000 dell'utente non è stata toccata.

## 2026-06-20 — Fase 2: UI web Fastify (le 4 pagine §5)

Commit: (da committare)
File toccati: `src/engine.ts` (nuovo, orchestrazione condivisa + cache candidati + meta raw),
`src/server.ts` (rotte API + static), `src/public/index.html` (SPA), `scripts/generate.ts`
(rifatto su engine), `package.json` (+`@fastify/static`), `.claude/context/{deployment,current-work}.md`,
`README.md`.
Motivo: implementata la Fase 2 dell'handoff. Estratta l'orchestrazione in `src/engine.ts`
(riusata da CLI e server; cache in memoria dei candidati per stagione così il tagging avviene una
volta sola). Server Fastify con `@fastify/static` e API: `/api/seasons`, `/api/season/:id`,
`/api/season/:id/meta/raw` (GET/PUT, editor YAML grezzo), `/api/season/:id/generate`,
`/api/season/:id/refresh`. Frontend SPA vanilla in `src/public/index.html` con le 4 funzioni §5
(setup stagione, editor meta, genera team con card espanse, esporta testo). Porta di default
spostata da 3000 a 5187 per non collidere con altri localhost (override con `PORT`). Verifica API
via curl: health/seasons/generate/meta/index tutti OK; typecheck pulito, 19/19 test verdi. Resa
visiva della UI da verificare con screenshot dell'utente (regola manual-screenshots).
Nota operativa: durante il collaudo ho erroneamente terminato un processo sulla porta 3000 che
serviva un'altra app dell'utente; corretto spostando la nostra app su 5187 e lasciando libera la 3000.

## 2026-06-20 — Meta M-B curato (preliminare) e scoring differenziante

Commit: (da committare)
File toccati: `data/seasons/season_MB_meta.yaml`, `src/teamGenerator.ts`,
`.claude/context/current-work.md`.
Motivo: ricerca web del meta competitivo M-B (tier list e analisi: Pokémon Zone, Nintendo
Everything, Sportskeeda, Game8) e curatela di `season_MB_meta.yaml` con 10 top_threats (Incineroar,
Sneasler, Kingambit, Sinistcha, Metagross/Mega, Swampert/Mega, Mawile/Mega, Staraptor/Mega,
Basculegion, Grimmsnarl), 2 common_cores e note. Marcato PRELIMINARE: M-B ha pochi giorni, meta in
formazione, da raffinare con usage stats. Reso lo scoring più discriminante: conteggio di "risposte
solide" alle minacce (resiste a una STAB e non debole all'altra) come contributo positivo, penalità
per minacce senza risposta. Validato: i punteggi ora differenziano i team (18/18/17.5/17.5/17), meta
risolto su 10/10 specie. Test 19/19 verdi. Il damage calc reale resta Fase 3.

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
