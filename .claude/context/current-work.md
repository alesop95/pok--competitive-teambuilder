---
generated-from-commit: 373419b
generated-from-branch: main
covers-paths:
  - src/pkmnData.ts
  - src/roleTagging.ts
  - src/teamGenerator.ts
  - data/**
  - scripts/**
last-verified-commit: 373419b
stato: in corso
source-doc: pokemon-champions-team-builder-spec.md
---

# Lavoro in corso

> La fonte di verità su cosa è fatto resta `memory/index.md` e il work-log, non le spunte di
> questo file.

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
- [ ] `season_MB.json` generato (lista M-B da serebii) con validità regolamento registrata
- [ ] `roleTagging.ts` implementa le regole §4.1, coperto da test verdi

Domande aperte:

Se/quando la community pubblicherà una mod per Reg M-B (oggi c'è solo `championsregma` ≈ M-A), va
agganciata al posto della curatela manuale della legalità. Da monitorare.

Peso di `@pkmn/mods` (~173 MB unpacked): valutare se è importabile solo la mod `champions` o se il
pacchetto va tenuto intero. Non bloccante.

## Riconciliazione

Ultima verifica: 2026-06-20 al commit 373419b.
