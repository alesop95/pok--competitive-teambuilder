# Registro delle decisioni architetturali

> Convenzione ADR-lite, append-only. Ogni decisione architetturale non ovvia entra come voce
> numerata con data, stato, contesto, decisione, motivazione e conseguenze. Una decisione non si
> cancella e non si riscrive: quando viene superata, si aggiunge una nuova voce che dichiara di
> superare la precedente e ne cita il numero. Le inferenze non confermate si marcano come da
> verificare e si promuovono a decisione solo quando una fonte le conferma.

## ADR-001 — Adozione del sistema di progetto portabile

Data: 2026-06-19
Stato: accettata
Contesto: il progetto necessita di uno stato interamente recuperabile da un clone e di
documentazione che resti allineata al codice senza rilettura integrale a ogni sessione.
Decisione: adottare il sistema descritto in `.claude/PROJECT-SYSTEM.md`, con motore di
riconciliazione ancorato ai commit e doppio livello documentale tracciato/ignorato.
Motivazione: persistenza strutturale su disco indipendente dalla sessione di chat, e controllo
umano sul versionamento.
Conseguenze: ogni passo significativo aggiorna schede, `last-verified-commit`, snapshot e
work-log; commit e push restano manuali.

## ADR-002 — Stack Node.js/TypeScript invece di Python

Data: 2026-06-19
Stato: accettata (pivot rispetto alla decisione iniziale Python)
Contesto: l'intero ecosistema dati e calcolo per Pokémon competitivo (Pokémon Showdown e i
pacchetti `@pkmn`/`@smogon`) è nativo TypeScript/Node e con licenza MIT. Usarlo da Python
imporrebbe un ponte permanente (sottoprocesso Node o microservizio HTTP) a ogni chiamata.
Decisione: backend interamente Node.js 20+ LTS / TypeScript, con Fastify come web server, `@pkmn/dex`
per i dati di gioco e `@smogon/calc` per il damage calc.
Motivazione: si elimina il ponte cross-linguaggio, si usa lo stesso linguaggio dei dati di gioco,
e ci si allinea allo standard de facto per backend web leggeri (obiettivo "eventualmente web").
Conseguenze: gestione dipendenze via npm con `package.json` (avvio identico su Windows e Linux,
niente più `run.sh`/`run.bat`); `package-lock.json` tracciato per build riproducibili.

## ADR-003 — Nessun database per l'MVP: storage a file JSON/YAML

Data: 2026-06-19
Stato: accettata
Contesto: i dati di gioco arrivano da `@pkmn/dex` (niente import/cache da gestire); roster, meta e
team generati sono pochi e diffabili.
Decisione: per l'MVP lo storage è a file flat (`data/seasons/*.json`, `*_meta.yaml`,
`data/generated_teams/*.json`). SQLite (`better-sqlite3`, MIT) si introduce solo se in futuro
serviranno query sullo storico che i file flat non supportano bene.
Motivazione: semplicità, leggibilità nei diff git, zero dipendenze di runtime extra.
Conseguenze: i dati curati restano tracciati come conoscenza che evolve stagione per stagione.

## ADR-004 — Repository GitHub pubblico, LICENSE MIT

Data: 2026-06-19
Stato: accettata
Contesto: il codice non contiene dati sensibili, solo logica di team building. Su account GitHub
Free, GitHub Pages gratuito funziona solo su repo pubblici.
Decisione: repository pubblico su `github.com/alesop95/pok--competitive-teambuilder`, licenza MIT.
Motivazione: abilita un eventuale frontend statico gratuito via Pages senza piano Pro, coerente con
l'ecosistema MIT da cui il progetto dipende.
Conseguenze: README pubblico in radice; nessun segreto va mai committato (la chiave API Claude del
rationale Livello 2 resta in `.env` ignorato).

## ADR-005 — Mod "champions" di Showdown come layer dati primario del formato

Data: 2026-06-19
Stato: accettata (verificata il 2026-06-19)
Contesto: esiste una mod community-maintained `champions` nel repository MIT di Pokémon Showdown
(`data/mods/champions`), usata anche dal calcolatore ufficiale Smogon, che copre già le differenze
del formato Champions (incluso il sistema Stat Points).
Verifica: il pacchetto npm `@pkmn/mods@0.10.11` (MIT, pubblicato il 2026-06-18) espone direttamente
sia la mod `champions` ("data and logic for Pokémon Champions" su Gen 9) sia una variante
`championsregma` che applica le restrizioni di regolamento. Quindi la mod è raggiungibile via npm,
NON va recuperata a mano dal repository Showdown.
Decisione: usare `@pkmn/mods` (mod `champions`) come fonte di verità delle regole e dei dati del
formato Champions, sopra `@pkmn/dex`; `data/champions_overrides.json` resta solo per eventuali
eccezioni residue non coperte.
Motivazione: evita di reimplementare a mano regole già curate e testate dalla community, e di
gestire un import manuale dal repo.
Conseguenze: dipendenza npm `@pkmn/mods` (pesante, ~173 MB unpacked: valutare se serve l'intero
pacchetto o solo la mod champions). La legalità di regolamento è gestita da `championsregma`, ma il
nome suggerisce Reg M-A: la copertura del Reg M-B è da chiarire (vedi ADR-007).

## ADR-008 — Selezione dei membri guidata da viability competitiva (damage calc)

Data: 2026-06-20
Stato: accettata
Contesto: la prima versione del generatore riempiva i team con un greedy che premiava il numero di
tag di ruolo e la difesa grezza, scegliendo sempre gli stessi Pokémon (Pikachu, Raichu, Slowbro,
Ariados in tutti e 5 i team) e ignorando la reale forza competitiva. Le fonti dati/calcolo
(`@pkmn/dex` + mod champions, `@smogon/calc` su `@pkmn/data`) sono best-in-class e corrette: il
difetto era solo nell'euristica di selezione.
Decisione: calcolare per ogni candidato una viability [0..1] = 0.5 pressione offensiva sul meta
(media del miglior danno reale alle top_threats via `@smogon/calc`) + 0.3 copertura difensiva del
meta + 0.2 livello statistico (BST). La viability domina la scelta del core (miglior tag per
viability) e del riempimento, con una penalità di diversità per i Pokémon già usati negli altri
team. I core osservati nel meta (`common_cores`) seedano proposte dedicate.
Motivazione: ancorare le proposte alla forza reale nel formato usando il calcolatore Smogon, non a
euristiche di versatilità; diversificare le proposte.
Conseguenze: i team sono dominati da Pokémon davvero forti e sono diversi tra loro; la generazione
fa ~200x10 damage calc memoizzati (sotto il secondo a regime). Raffinamenti residui: la viability
sovrastima attaccanti fragili ad alto danno grezzo (es. Pyroar), da bilanciare con bulk/velocità
nella rifinitura finale.

## ADR-007 — Fonte dati del roster di stagione e regolamento target

Data: 2026-06-19
Stato: accettata (decisa con l'utente il 2026-06-20)
Contesto: il roster "M-B" può essere derivato dalla mod `@pkmn/mods` (dati di gioco) e/o dalla
lista leggibile di serebii.net. La mod community ha solo `championsregma` (verosimilmente Reg M-A);
non risulta una cartella per Reg M-B.
Decisione: i dati di gioco (stats, abilità, movepool, mosse, strumenti, regole del formato) vengono
programmaticamente dalla mod `champions` via `@pkmn/mods` + `@pkmn/dex`, in modo deterministico e
riproducibile. Il regolamento target è Reg M-B: poiché la mod copre M-A, la legalità di regolamento
e la lista di disponibilità M-B le deriviamo da serebii.net (cross-check umano, ADR-006) e dalla
conoscenza dell'utente, curate sopra i dati della mod, finché la community non pubblica M-B.
Motivazione: massima riproducibilità sui dati di gioco senza scraping fragile, mantenendo serebii
come fonte di disponibilità per il regolamento corrente.
Conseguenze: `data/seasons/season_MB.json` contiene la lista M-B-legale (derivata da serebii +
curatela), arricchita a runtime con i dati della mod. Workflow stagionale §8 invariato: a ogni
stagione si rilegge serebii e si aggiorna il file. Da chiarire in seguito se/quando `championsregma`
o una nuova mod coprirà M-B, per agganciarla.

## ADR-006 — Fonti dati di stagione: serebii.net

Data: 2026-06-19
Stato: accettata
Contesto: il roster, le mosse e gli strumenti disponibili in una stagione di Pokémon Champions vanno
compilati a mano in `data/seasons/`. Serve una fonte autorevole e stabile da cui derivarli.
Decisione: usare le pagine serebii.net di Pokémon Champions come fonte di riferimento, da rileggere
a ogni aggiornamento del roster di stagione: Pokémon
(https://www.serebii.net/pokemonchampions/pokemon.shtml), mosse
(https://www.serebii.net/pokemonchampions/moves.shtml), attacchi aggiornati
(https://www.serebii.net/pokemonchampions/updatedattacks.shtml), strumenti
(https://www.serebii.net/pokemonchampions/items.shtml).
Motivazione: fonte consolidata di disponibilità di stagione, da incrociare con la mod `champions`
(ADR-005) che copre invece le regole fini del formato.
Conseguenze: la procedura di aggiornamento stagionale (handoff §8) parte da queste pagine; i link
sono tracciati in `data/seasons/README.md` e `context/STACK.md`. Sono riferimento, non dipendenze di
codice.
