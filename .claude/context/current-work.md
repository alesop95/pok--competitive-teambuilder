---
generated-from-commit: 373419b
generated-from-branch: main
covers-paths:
  - src/pkmnData.ts
  - src/roleTagging.ts
  - src/teamGenerator.ts
  - data/**
  - scripts/**
last-verified-commit: 17fdd2a
stato: in corso
source-doc: pokemon-champions-team-builder-spec.md
---

# Lavoro in corso

> La fonte di verità su cosa è fatto resta `memory/index.md` e il work-log, non le spunte di
> questo file.

## Stato corrente (accumulo feature, rifinitura alla fine)

Fatto in questa fase di accumulo: 3 migliorie set (Mega, abilità competitive incl. hidden, filtro
mosse impratiche); selezione guidata da viability competitiva via damage calc (ADR-008, risolve il
bias "stessi Pokémon in ogni team"); uso dei `common_cores` del meta.

Feature scelte: tutte fatte (common_cores, salvataggio/storico UI, legalità M-B cross-check serebii
con `data/seasons/legal_MB.json` + validatore). Da valutare poi: Fase 4 (rationale Livello 2 via API
Claude), Fase 5 (packaging/deploy).

Rifinitura finale: FATTA. Viability ora include la stazza (no Pyroar dominante); speed_control
distinto da Trick Room nel tagging; natura/Stat Points dei set dal contesto del team (Brave/Quiet
solo nei team Trick Room).

Fase 5 (prep deploy): FATTA. `npm start` + `render.yaml` per deploy web Render gratuito. Tauri
desktop resta alternativa futura non implementata.

Documentazione tecnica: FATTA in `docs/TECHNICAL.md` (stack, tool open source con licenze, matematica
del motore con formule e riferimenti percorso:simbolo); linkata dal README.

Meta da usage reali: FATTO. `season_MB_meta.yaml` rigenerato dalle usage stats reali (Pikalytics
Reg M-B / ChampionsMeta, ~22 giu 2026): 17 top_threats per ranking di usage e common_cores reali
(Incineroar+Sinistcha, rain Archaludon+Pelipper+Swampert, screens Grimmsnarl+Sneasler). La
generazione è ora ancorata ai core realmente giocati.

Stato: l'app è completa rispetto a quanto richiesto. Resta opzionale la Fase 4 (rationale Livello 2
via API Claude, non selezionata) e i limiti noti di `docs/TECHNICAL.md` §7. Processo: commit del
blocco meta + (le schede sono già ancorate a 17fdd2a; al prossimo commit rilanciare `sync-context`).

## Feature: Fase 1 — fondamenta del motore (data layer + tagging ruoli)

Cosa fa: porta i dati di gioco reali nel codice (mod `champions` via `@pkmn/mods` + `@pkmn/dex`),
costruisce il roster M-B e implementa il tagging dei ruoli deterministico (§4.1), primo mattone
della generazione team (§4.2).

Decisioni di contesto (vedi ADR-005, ADR-006, ADR-007):

- Dati di gioco (stats, abilità, movepool, mosse, strumenti, regole) dalla mod `champions` via
  `@pkmn/mods` + `@pkmn/dex`. Verificato: la mod è su npm (`@pkmn/mods@0.10.11`).
- Regolamento target: Reg M-B, in vigore dalle 02:00 UTC di mer 17 giugno 2026 alle 01:59 UTC di
  mer 2 settembre 2026. La mod ha solo `championsregma` (verosimilmente Reg M-A), quindi la lista
  di disponibilità e la legalità M-B le deriviamo da serebii.net + conoscenza utente.
- serebii.net resta il cross-check umano e la fonte della lista M-B (link in `data/seasons/README.md`).

File da creare/modificare:

```
src/pkmnData.ts                 caricare @pkmn/dex con la mod champions applicata; query specie/mosse/strumenti
scripts/fetch_roster.ts         scraper deterministico serebii -> data/seasons/season_MB.json (§8, token-economy)
data/seasons/season_MB.json     roster M-B (lista disponibilità + validità regolamento)
data/seasons/season_MB_meta.yaml meta curato a mano (top_threats, common_cores) quando disponibile
src/roleTagging.ts              implementare le regole della tabella §4.1
tests/roleTagging.test.ts       casi reali §4.1 (es. Prankster + Reflect => screens_setter)
```

Definition of done:

- [x] ADR-005 chiusa: la mod `champions` è raggiungibile via `@pkmn/mods` (verificato)
- [x] fonte dati e regolamento decisi (ADR-007)
- [x] `@pkmn/mods` installato e `pkmnData.ts` carica la mod champions e interroga una specie reale (test verdi)
- [x] regolamento M-B ufficiale ricercato sul web e versionato in `season_MB.json` (con fonti)
- [x] `season_MB.json` generato (283 forme / 208 specie da serebii via `scripts/fetch_roster.ts`)
- [x] `roleTagging.ts` implementa le regole §4.1, coperto da test verdi (14/14)
- [x] `teamGenerator.ts` (§4.2): archetipi, core, riempimento greedy, scoring coverage (test verdi)
- [x] `rationale.ts` Livello 1 (§4.3) e CLI `scripts/generate.ts` con output Markdown + JSON
- [x] Fase 1 completa: pipeline offline tag→genera→rationale→file gira in ~2s sul roster M-B

Limiti noti (rinviati a Fase 3, non bloccanti): con meta non curato i punteggi sono quasi tutti
pari (manca la coverage offensiva reale); il riempimento è greedy con tiebreak sul numero di ruoli;
lo scoring non usa ancora il damage calc reale (`@smogon/calc`). La qualità sale quando si cura
`season_MB_meta.yaml` (top_threats) e in Fase 3.

Domande aperte:

Se/quando la community pubblicherà una mod per Reg M-B (oggi c'è solo `championsregma` ≈ M-A), va
agganciata al posto della curatela manuale della legalità. Da monitorare.

Peso di `@pkmn/mods` (~173 MB unpacked): valutare se è importabile solo la mod `champions` o se il
pacchetto va tenuto intero. Non bloccante.

## Feature: Fase 3 — damage calc reale e raffinamento (handoff §7)

Cosa fa: porta numeri di danno verificati nel motore e affina lo scoring. `src/calc.ts` usa
`@smogon/calc` su una `Generation` `@pkmn/data` costruita sulla mod champions; l'engine calcola la
coverage offensiva reale contro le minacce meta e la espone in rationale e UI.

Definition of done:

- [x] `@smogon/calc` + `@pkmn/data` integrati con la mod champions (verificato, numeri plausibili)
- [x] `bestDamagePercent` con scelta mossa pesata sulla stat offensiva, filtro mosse poco pratiche, memo
- [x] engine: post-pass coverage offensiva (≥50% = risposta solida), score aggiornato e riordino
- [x] rationale e card UI mostrano i numeri di danno reali; coverage 10/10 minacce M-B
- [x] archetipo Weather Offense + bonus di sinergia; 21/21 test verdi, typecheck pulito
- [x] set completi per ogni membro: item, abilità, natura, Stat Points (66/max32, §0.5), 4 mosse
      (`src/setBuilder.ts`), esposti in rationale, API e UI + export testuale
- [x] resa visiva di coverage offensiva e set nelle card verificata con screenshot (OK)

Limiti noti: scelte di set euristiche (talvolta mosse subottimali, abilità non ideale se l'unica
utile è hidden); la scelta mossa del calc resta euristica (1 calc per coppia, spread standard, niente
field/abilità avversarie); Mega via strumento non auto-evolve in calc; il meta è preliminare.

## Feature: Fase 2 — UI web minima (handoff §5)

Cosa fa: espone il motore via browser. Engine condiviso `src/engine.ts` (cache candidati), server
Fastify `src/server.ts` con API REST + static, SPA `src/public/index.html` con le 4 pagine §5.

Definition of done:

- [x] engine condiviso riusato da CLI e server (`generateForSeason`, meta raw GET/PUT)
- [x] server Fastify + `@fastify/static`; API seasons/season/meta/generate verificate via curl
- [x] SPA con setup stagione, editor meta YAML, genera team (card), esporta testo
- [x] porta default 5187 (non collide con altri localhost; la 3000 è di un'altra app utente)
- [x] resa visiva della UI verificata con screenshot dell'utente (tab Setup: layout/dati OK)

## Riconciliazione

Ultima verifica: 2026-06-20 al commit 373419b (le schede non riflettono ancora i commit successivi;
ri-ancorare con `sync-context` dopo il prossimo commit).
