# Fonti del progetto

> Inventario completo e categorizzato di tutto ciò che il progetto usa o consulta: pacchetti
> software con licenza, dati di gioco, regolamento, usage stats, riferimenti di meccanica e di
> hosting. Per ogni voce è indicato a cosa serve nel progetto. Documento tracciato; va aggiornato
> quando si aggiunge una dipendenza o una fonte dati. La distinzione tra ciò che è fonte di verità
> esterna e ciò che è euristica nostra è spiegata in `docs/TECHNICAL.md`.

## 1. Dipendenze software (installate, tutte open source)

Sono i pacchetti npm da cui dipende il codice. Le licenze sono permissive (MIT salvo dove indicato).

| Pacchetto | npm | Repository | Licenza | Uso nel progetto |
|---|---|---|---|---|
| `@pkmn/dex` | https://www.npmjs.com/package/@pkmn/dex | https://github.com/pkmn/ps | MIT | Dati di gioco: specie, stats base, abilità, movepool, type chart |
| `@pkmn/mods` | https://www.npmjs.com/package/@pkmn/mods | https://github.com/pkmn/ps | MIT | Mod `champions` (dati/regole del formato) applicata alla dex |
| `@pkmn/data` | https://www.npmjs.com/package/@pkmn/data | https://github.com/pkmn/ps | MIT | Costruisce la `Generation` consumata da `@smogon/calc` |
| `@smogon/calc` | https://www.npmjs.com/package/@smogon/calc | https://github.com/smogon/damage-calc | MIT | Motore di damage calc reale (formula del danno gen 1-9) |
| `fastify` | https://www.npmjs.com/package/fastify | https://github.com/fastify/fastify | MIT | Web server |
| `@fastify/static` | https://www.npmjs.com/package/@fastify/static | https://github.com/fastify/fastify-static | MIT | Serve il frontend statico |
| `js-yaml` | https://www.npmjs.com/package/js-yaml | https://github.com/nodeca/js-yaml | MIT | Parsing dei file meta di stagione |
| `vitest` | https://www.npmjs.com/package/vitest | https://github.com/vitest-dev/vitest | MIT | Test runner |
| `tsx` | https://www.npmjs.com/package/tsx | https://github.com/privatenumber/tsx | MIT | Esecuzione TypeScript senza build (dev e avvio) |
| `typescript` | https://www.npmjs.com/package/typescript | https://github.com/microsoft/TypeScript | Apache 2.0 | Compilatore e type-check |

Runtime: [Node.js](https://nodejs.org/) 20+ (licenza OpenJS). Linguaggio: [TypeScript](https://www.typescriptlang.org/).

## 2. Origine dei dati di gioco e del calcolo

Tutto l'ecosistema dati e calcolo deriva da Pokémon Showdown, lo stesso che alimenta il calcolatore
ufficiale Smogon. La mod specifica del formato e il motore del danno vengono da lì.

| Cosa | Link | Licenza | Ruolo |
|---|---|---|---|
| Pokémon Showdown (server) | https://github.com/smogon/pokemon-showdown | MIT | Origine di tutti i pacchetti `@pkmn`/`@smogon` |
| Mod `champions` | https://github.com/smogon/pokemon-showdown/tree/master/data/mods/champions | MIT | Dati e regole di Pokémon Champions (via `@pkmn/mods`) |
| Mod `championsregma` | https://github.com/smogon/pokemon-showdown/tree/master/data/mods/championsregma | MIT | Restrizioni Regulation M-A (non M-B; vedi ADR-007) |
| Calcolatore ufficiale Smogon | https://calc.pokemonshowdown.com/ | - | Verifica manuale dei numeri di danno |
| `@pkmn/dmg` (alternativa non usata) | https://github.com/pkmn/dmg | MIT | Damage calc alternativo, valutato e non adottato |
| Showdown client (NON usato) | https://github.com/smogon/pokemon-showdown-client | AGPLv3 | Citato solo per chiarezza di licenza: non usiamo la loro UI |

## 3. Riferimenti di meccanica e formule

La formula del danno implementata da `@smogon/calc` è quella canonica delle generazioni Pokémon. Per
verificarne i passaggi si usano queste fonti; il progetto non reimplementa la formula, la consuma dal
pacchetto.

| Riferimento | Link |
|---|---|
| Formula del danno (Bulbapedia) | https://bulbapedia.bulbagarden.net/wiki/Damage |
| Type chart / efficacia di tipo (Bulbapedia) | https://bulbapedia.bulbagarden.net/wiki/Type_chart |
| Statistiche e formule (Bulbapedia) | https://bulbapedia.bulbagarden.net/wiki/Statistic |
| Codice del damage calc Smogon | https://github.com/smogon/damage-calc |

## 4. Dati di stagione e legalità (serebii.net)

Le pagine serebii del formato sono la fonte autorevole di disponibilità (Pokémon, mosse, strumenti)
e regole, lette dagli scraper deterministici in `scripts/` e versionate in `data/seasons/`.

| Pagina | Link | Generato in |
|---|---|---|
| Pokémon disponibili | https://www.serebii.net/pokemonchampions/pokemon.shtml | `season_<id>.json` (roster) |
| Mosse usabili | https://www.serebii.net/pokemonchampions/moves.shtml | `legal_<id>.json` (mosse) |
| Attacchi aggiornati | https://www.serebii.net/pokemonchampions/updatedattacks.shtml | riferimento meccaniche del formato |
| Strumenti disponibili | https://www.serebii.net/pokemonchampions/items.shtml | `legal_<id>.json` (strumenti) |
| Regole Ranked Reg M-B | https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-b.shtml | `season_MB.json` (regulation) |

## 5. Regolamento e composizione del meta (ricerca)

Fonti consultate per definire le regole della Regulation M-B e l'analisi iniziale del meta.

| Fonte | Link |
|---|---|
| Pokémon Zone - Regolamenti | https://www.pokemon-zone.com/champions/regulations/ |
| Pokémon Zone - Tier list / metagame | https://www.pokemon-zone.com/champions/ |
| Game8 - Regulation M-B roster e regole | https://game8.co/games/Pokemon-Champions/archives/605482 |
| Sportskeeda - Pokémon ammessi M-B | https://www.sportskeeda.com/pokemon/all-pokemon-allowed-pokemon-champions-regulation-set-m-b |
| Bulbagarden - annuncio ruleset M-A/M-B | https://bulbagarden.net/threads/pokemon-champions-launches-new-ruleset-for-competitive-vgc-regulation-set-m-a-runs-until-june-17th-2026.310333/ |
| Nintendo Everything - winners/losers M-B | https://nintendoeverything.com/pokemon-champions-regulation-m-b-new-pokemon/ |

## 6. Usage stats reali (meta corrente)

Fonti delle usage stats che alimentano `season_MB_meta.yaml` (top_threats e common_cores reali).

| Fonte | Link |
|---|---|
| Pikalytics - Champions Reg M-B | https://pikalytics.com/champions |
| ChampionsMeta - usage rankings (fonte Limitless) | https://championsmeta.io/meta |
| Showdown Tier - tier list e win rate M-B | https://showdowntier.com/formats/dmb/index.html |

## 7. Fonti ufficiali

| Fonte | Link |
|---|---|
| Pagina ufficiale gameplay Pokémon Champions | https://champions.pokemon.com/en-us/gameplay/ |

## 8. Hosting e deploy (Fase 5)

| Argomento | Link |
|---|---|
| Render - free tier reale 2026 | https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026 |
| Piani GitHub (Pages/Actions) | https://docs.github.com/get-started/learning-about-github/githubs-products |
| Limiti GitHub Pages | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits |

## 9. Tool della community (riferimento, NON dipendenze)

Strumenti gratuiti consultati come confronto o ispirazione; non fanno parte del codice.

| Tool | Link |
|---|---|
| Pikalytics - Team Builder | https://www.pikalytics.com/team |
| ChampTeams.gg | https://champteams.gg/ |
| VGC.tools | https://vgc.tools/ |
| Champions Builder | https://www.championsbuilder.com/ |
| Champions Lab | https://championslab.xyz/team-builder |
| PokéBase - Team Builder Champions | https://pokebase.app/pokemon-champions/team-builder |
| Game8 - Builder / Damage Calc | https://game8.co/games/Pokemon-Champions/archives/Builder |
| VGC Multi Calc | https://vgcmulticalc.com/ |
