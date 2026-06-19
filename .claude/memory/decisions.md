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
Stato: proposta (da verificare l'accessibilità via `@pkmn/mods` in Fase 0/1)
Contesto: esiste una mod community-maintained `champions` nel repository MIT di Pokémon Showdown
(`data/mods/champions`), usata anche dal calcolatore ufficiale Smogon, che copre presumibilmente
già gran parte delle differenze del formato Champions (incluso il sistema Stat Points).
Decisione: partire dalla mod esistente come fonte di verità delle regole Champions, non da zero;
`data/champions_overrides.json` resta solo per le eventuali eccezioni residue non coperte.
Motivazione: evita di reimplementare a mano regole già curate e testate dalla community.
Conseguenze: da verificare in sviluppo se la mod è esposta dal pacchetto npm `@pkmn/mods` o va
recuperata direttamente dal repository Showdown perché troppo recente (gioco uscito aprile 2026).
Questa voce si promuove ad accettata quando la verifica conferma la via di accesso.

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
