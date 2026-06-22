# Pokémon Champions Team Builder

Strumento locale (Windows 11 / Linux) che, dato il roster di Pokémon disponibili in una stagione di
Pokémon Champions, genera proposte di team competitivi con ruoli, sinergie, copertura difensiva e
offensiva, tattica e counter attesi. Ragiona per tag deterministici e coverage, non per simulazione
di combattimento. È pensato per essere aggiornato stagione per stagione modificando solo i file
dati, senza toccare il codice.

---

## Stack

Backend Node.js 20+ LTS in TypeScript, web server [Fastify](https://fastify.dev/). I dati di gioco
e i calcoli provengono dall'ecosistema open source MIT costruito attorno a Pokémon Showdown:

| Componente | Pacchetto | Licenza |
|---|---|---|
| Dati di gioco, type chart | [`@pkmn/dex`](https://www.npmjs.com/package/@pkmn/dex) | MIT |
| Damage calc (gen 1-9) | [`@smogon/calc`](https://www.npmjs.com/package/@smogon/calc) | MIT |
| Parsing meta di stagione | [`js-yaml`](https://www.npmjs.com/package/js-yaml) | MIT |
| Test runner | [Vitest](https://vitest.dev/) | MIT |

Le regole specifiche del formato derivano dalla mod community
[`champions`](https://github.com/smogon/pokemon-showdown/tree/master/data/mods/champions) del
repository MIT di [Pokémon Showdown](https://github.com/smogon/pokemon-showdown).

---

## Come funziona

```
roster di stagione (data/seasons/*.json)  +  meta corrente (data/seasons/*_meta.yaml)
        │
        ▼
tagging dei ruoli (regole deterministiche su stats/ability/movepool)
        │
        ▼
generazione candidati per archetipo  →  scoring sinergia + coverage vs meta threats
        │
        ▼
N proposte di team, ciascuna con tattica, debolezze e counter (rationale testuale)
```

Il rationale ha due livelli: il Livello 1 è offline e deterministico (sempre disponibile, zero
costi); il Livello 2 è un enhancement opzionale che usa l'API Claude per prosa più naturale, attivo
solo se è presente `ANTHROPIC_API_KEY`.

---

## Avvio

```
npm install
npm run dev      # avvia l'app web su http://127.0.0.1:5187 (porta override con PORT)
npm run generate # in alternativa: genera i team da CLI e scrive un report in data/generated_teams/
npm test         # esegue la suite Vitest
```

L'avvio è identico su Windows e Linux. La porta di default è 5187; si cambia con la variabile
d'ambiente `PORT`.

---

## Stato

- [x] Fase 0 — inizializzazione e scaffold del progetto
- [ ] Fase 1 — motore offline da CLI (tagging ruoli + generazione team)
- [ ] Fase 2 — UI web minima (MVP)
- [ ] Fase 3 — raffinamento scoring e damage calc reale
- [ ] Fase 4 — rationale Livello 2 via API Claude
- [ ] Fase 5 — packaging desktop o deploy web (opzionale)

---

## Licenza

[MIT](./LICENSE).

## Documentazione

La documentazione tecnica completa (stack, tool open source, e la matematica del motore: tagging,
viability, scoring, damage calc con la formula e la sua provenienza) è in
[docs/TECHNICAL.md](./docs/TECHNICAL.md). L'inventario di tutte le fonti usate dal progetto è in
[docs/SOURCES.md](./docs/SOURCES.md).

## Riferimenti

- Pagina ufficiale gameplay: https://champions.pokemon.com/en-us/gameplay/
- Pokémon Showdown (motore, MIT): https://github.com/smogon/pokemon-showdown
- Calcolatore ufficiale Smogon: https://calc.pokemonshowdown.com/
