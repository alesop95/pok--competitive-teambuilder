# Come funziona l'app, stadio per stadio

> Documento tracciato. Spiega la pipeline del motore percorrendola nell'ordine in cui i dati la
> attraversano, con il perché di ogni stadio e cosa c'è implementato dietro. Complementare a
> `docs/TECHNICAL.md` (che dà le formule) e al diagramma `.claude/context/diagrams/pipeline.svg`. I
> riferimenti al codice sono nella forma percorso:simbolo. La logica è coperta da 31 test su sei file
> (`tests/`), uno per area; questo documento è la lettura discorsiva di quella stessa logica.

## 1. Data layer

Il punto di accesso ai dati di gioco è `src/pkmnData.ts:getChampionsDex`, che carica `@pkmn/dex`
applicando la mod `champions` di `@pkmn/mods` con `Dex.mod('champions', …)`. Da qui derivano specie,
statistiche base, abilità, movepool, type chart e la mappa difensiva di type-effectiveness. Una query
reale rende, per esempio, Incineroar come Fuoco/Buio, Attacco base 115, abilità Blaze e Intimidate. Il
motivo di questo stadio è non scrivere a mano alcun dato: tutto proviene dall'ecosistema MIT di
Pokémon Showdown, la stessa fonte del calcolatore ufficiale Smogon. Il test `pkmnData.test.ts`
verifica che la dex carichi un numero plausibile di specie e restituisca stats e abilità reali.

## 2. Tagging dei ruoli

`src/roleTagging.ts:tagRoles` assegna a ogni Pokémon tag di ruolo con regole deterministiche su stats,
abilità e movepool: per esempio Prankster più Reflect o Light Screen produce screens_setter, mentre
velocità base non superiore a 60 con Attacco o Att. Speciale almeno 100 produce trick_room_abuser. Il
controllo velocità in avanti (Tailwind, Icy Wind, Electroweb) è tenuto distinto dal Trick Room, che è
controllo inverso, così un setter di Trick Room non viene scambiato per un membro da team Tailwind. È
un modulo puro, senza rete, quindi testabile con fixture: undici test coprono una regola ciascuno.
Questo stadio decide cosa sa fare ogni Pokémon, e quel sapere guida gli archetipi e gli spread.

## 3. Damage calc

`src/calc.ts:bestDamagePercent` calcola il danno con `@smogon/calc`, il motore del calcolatore
ufficiale Smogon, su una `Generation` di `@pkmn/data` costruita dalla dex moddata champions. Modella
le abilità di entrambi i contendenti (immunità come Levitate, riduttori come Thick Fat, boost come
Adaptability), gli strumenti (Life Orb potenzia del trenta per cento, verificato: Incineroar Flare
Blitz contro Amoonguss passa da 92-109% a 120-142% con Life Orb) e il campo (meteo e terreno). La
scelta della mossa è un'euristica deterministica nostra che massimizza potenza per STAB per efficacia
per stat offensiva per modificatore meteo, scartando le mosse poco pratiche in doppio e quelle a cui
il difensore è immune per abilità. Quattro test verificano numeri reali, il potenziamento meteo e
l'immunità da abilità.

## 4. Viability

`src/engine.ts:computeViability` assegna a ogni candidato una viability in zero-uno che pesa la
pressione offensiva reale sul meta (dal damage calc), la copertura difensiva del meta, la stazza, il
livello statistico e la velocità (pesi in `VIABILITY_WEIGHTS`, in un punto solo). È il meccanismo che
ancora la selezione alla forza reale nel formato: senza di esso il generatore premiava la versatilità
e sceglieva sempre gli stessi Pokémon, anche deboli. Con esso i team sono dominati dai mostri davvero
forti del meta.

## 5. Generazione dei team

`src/teamGenerator.ts:generateTeams` identifica gli archetipi disponibili incrociando i tag, sceglie
per ciascun ruolo del core il candidato con viability più alta, e seeda proposte dedicate dai
common_cores osservati nel meta (per esempio Incineroar più Sinistcha). Gli slot rimanenti si
riempiono con una salita greedy che massimizza la coverage difensiva e applica una penalità di
diversità, così gli stessi Pokémon non compaiono in ogni proposta. Cinque test coprono il
rilevamento degli archetipi, la Species Clause, l'ordinamento e l'integrazione su dati reali.

## 6. Coverage offensiva

In `src/engine.ts:generateForSeason`, per ogni minaccia del meta si cerca la risposta migliore tra i
set della squadra, calcolata sotto il campo che il team imposta da solo. È qui che vive la regola
corretta sul meteo: il punteggio usa sempre il campo reale del team (un team che non setta la pioggia
non riceve il bonus pioggia), mentre l'override manuale dalla UI è solo una lente di visualizzazione
del danno mostrato e non cambia l'ordinamento. Le risposte solide, oltre il cinquanta per cento,
alzano il punteggio finale.

## 7. Costruzione del set

`src/setBuilder.ts:buildSet` produce il set completo: abilità competitiva (anche nascosta), strumento
scelto dal pool legale di M-B (in cui Choice Band, Choice Specs, Rocky Helmet e Assault Vest non
esistono, mentre ci sono Light Clay, Life Orb, Leftovers, Sitrus e altri), natura e bilanciamento in
Stat Points secondo il contesto della squadra, quattro mosse (la STAB migliore, una mossa di coverage
scelta per colpire più minacce del meta, la mossa di ruolo e Protect) e, per un solo membro del team,
la Mega evoluzione con la sua Mega Stone. Cinque test coprono item, forma Mega, mosse, vincoli degli
Stat Points e l'esclusione delle mosse poco pratiche.

## 8. Vulnerabilità e spread difensivo mirato

Sempre in `src/engine.ts`, il danno in arrivo è valutato sulla stazza reale del set, convertendo gli
Stat Points in EV (`spToEvs`) e usando lo strumento del set. Per i membri di ruolo difensivo, che
dovrebbero reggere, la difesa viene concentrata nella categoria (fisica o speciale) colpita dalla
minaccia peggiore invece di uno split. Se una minaccia mette comunque OHKO il membro, si segnala la
vulnerabilità peggiore della squadra con una sola nota: per esempio Swampert messo OHKO da Sinistcha
intorno al 251 per cento per la quadrupla debolezza all'Erba. La regola completa è in
`docs/TECHNICAL.md` sezione 4.8.

## 9. Legalità di formato

`src/engine.ts:validateSet` controlla ogni set contro `data/seasons/legal_MB.json`, scrapato da
serebii: uno strumento non disponibile nel formato viene sostituito con un fallback legale e
segnalato. Due test lo verificano, incluso il caso reale di Safety Goggles, non disponibile in M-B.

## 10. Rationale e output

`src/rationale.ts` assembla il testo deterministico con composizione, ruoli, punti di forza,
debolezze e coverage con numeri reali. Lo stesso motore alimenta la CLI (`npm run generate`, scrive un
report in `data/generated_teams/`) e il server Fastify con la UI su `http://127.0.0.1:5187`.

## Aggiornamento dei dati del formato

I dati del formato vengono da Pokémon Showdown via `@pkmn/mods`. Lo script `npm run check-mb`
(`scripts/check_mb_update.ts`) confronta la versione installata con l'ultima su npm e verifica la
presenza delle Mega della generazione Z-A come indicatore di freschezza. Quando esce il completamento
di M-B a monte, la procedura è `npm update @pkmn/mods` seguito da `npm run roster` e `npm run legality`
per rigenerare roster e legalità da serebii.
