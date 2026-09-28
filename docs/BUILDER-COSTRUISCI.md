# Modalità Costruisci: builder manuale interattivo con copilota

> Documento di design, tracciato. Definisce la seconda modalità dell'app accanto a Genera: un builder
> manuale in cui l'utente sceglie i Pokémon a mano e riceve analisi in tempo reale e suggerimenti
> guidati dal motore. Nasce come risposta ai builder esistenti, in primo luogo champteams.gg/builder,
> con l'obiettivo esplicito di offrire qualcosa che quei tool non hanno. La decisione sintetica è in
> ADR-012; qui c'è il disegno esteso e la mappatura sul motore.

## Riferimento e posizionamento

Il riferimento diretto è ChampTeams.gg Builder (https://champteams.gg/builder), un builder VGC per
Pokémon Champions con slot manuali, coverage di tipo, speed tier, damage calc e import/export
Showdown. È un ottimo strumento di analisi statica: ti dice com'è la squadra che hai montato. Anche
Pikalytics, VGC.tools e simili si fermano lì. La nostra app ha però un motore generativo che ragiona
per viability e danno reale contro il meta corrente, cosa che quei builder non hanno. La modalità
Costruisci fonde le due cose: il controllo manuale di un builder e l'intelligenza incrementale del
nostro generatore.

## Le quattro capacità distintive

La modalità Costruisci si distingue per quattro capacità, tutte scelte come parte dell'identità
dell'app. La prima e principale è il copilota di completamento: mentre monti la squadra a mano, a
ogni membro aggiunto il motore valuta la squadra parziale e propone i migliori Pokémon per gli slot
vuoti, ciascuno con una motivazione concreta che nomina le minacce del meta che quel pick risolve e i
buchi difensivi che copre. Nessun tool esistente suggerisce il prossimo pick in modo guidato dal
danno reale contro il meta e ne spiega il perché: è il nostro generatore usato in modo incrementale
dentro il builder, ed è il differenziatore centrale.

La seconda è la scorecard delle minacce con numeri di danno reali. Per ciascuna delle minacce del
meta corrente la scorecard dice se la squadra la batte offensivamente, con quale membro e con quale
percentuale di danno calcolata da @smogon/calc[^1], se ha una risposta difensiva solida, e se la
minaccia rischia di mettere fuori gioco in un colpo un membro difensivo. È una matrice minaccia per
minaccia fondata sul danno reale e sull'usage corrente, non la coverage di tipo astratta che mostrano
gli altri.

La terza è la spiegazione narrativa su richiesta: un testo che spiega perché la squadra funziona,
quali sono i ruoli e la spina dorsale di supporto, la win condition e le fragilità, e come giocarla
contro il meta. È il nostro punto forte, perché gli altri tool mostrano numeri mentre noi ragioniamo
a parole, e riusa il generatore di rationale che l'app ha già.

La quarta è il confronto tra varianti: si salvano due versioni della stessa squadra e l'app evidenzia
in cosa differiscono per coverage, speed e risposte al meta, utile per rifinire una scelta di set o
di membro. È la capacità secondaria delle quattro.

## Ambito della prima versione

La v1 consegna il builder manuale con l'analisi in tempo reale, la scorecard delle minacce e il
copilota di completamento, cioè il nucleo che rende l'app unica, insieme a import/export Showdown e
salvataggio, che già esistono nel motore. La spiegazione narrativa entra in v1 se il riuso del
rationale esistente resta economico, altrimenti slitta di poco; il confronto tra varianti è il
naturale fast-follow. Questa ripartizione è indicativa e si può rivedere in fase di realizzazione.

## Mappatura sul motore esistente

Il punto che rende il tutto fattibile è che quasi tutto poggia su codice che c'è già. Gli slot
manuali sono una lista di membri costruita interattivamente, lo stesso concetto di `locked` che la
generazione con vincoli usa già (ADR-010). I set di ogni membro si costruiscono con `setBuilder`, e
restano modificabili o importabili in formato Showdown con il modulo `src/showdown.ts`. La coverage,
gli speed tier e il danno vengono dalle mappe difensive di `pkmnData`, dalle statistiche base e da
`bestDamagePercent` di `src/calc.ts`. La scorecard riusa la logica di risposte offensive e difensive
e di vulnerabilità strutturale che `src/engine.ts` produce già durante la generazione. La spiegazione
riusa `src/rationale.ts`. Il salvataggio e l'export usano IndexedDB e `exportTeam` come nella
modalità Genera.

Servono due funzioni nuove e sottili, da collocare in un modulo dedicato lato motore, per esempio
`src/builderAnalysis.ts`, entrambe costruite sopra i pezzi elencati.

```
analyzeTeam(seasonId, members: string[]): Promise<TeamAnalysis>
  - coverage offensiva: per tipo d'attacco, quante minacce del meta colpisce super-efficace
  - buchi difensivi: tipi a cui 3+ membri sono deboli (stackedWeaknesses)
  - speed tier: velocità base di ogni membro rispetto agli speed_benchmarks del meta
  - threatScorecard[]: per ogni minaccia { minaccia, colpitaDa, mossa, pctMax, rispostaOffensiva,
                       rispostaDifensiva, dannoInArrivoPeggiore, rischioKO }
  riusa: getThreatTypes, bestDamagePercent, getDefenseMap, stackedWeaknesses, baseStats

suggestNextPicks(seasonId, locked: string[], topK: number): Promise<Suggestion[]>
  - candidati non ancora in squadra, ordinati per punteggio marginale:
      viability + minacce oggi scoperte che il candidato risolve + buchi difensivi coperti
      - ridondanza di tipo - diversità
  - ogni suggerimento porta una `reason` con le minacce risolte e i buchi coperti
  riusa: computeViability, marginalScore, la scorecard del team parziale
```

## Interfaccia (scheda Costruisci)

L'interfaccia aggiunge una scheda Costruisci accanto alle quattro attuali, dentro la stessa SPA
client-side in `web/`. La scheda mostra sei slot: ogni slot ha un selettore di specie cercabile sul
roster della stagione (i nomi vengono da `available_pokemon` di `loadSeason`, già disponibili nel
browser). Scelto un membro, il suo set viene costruito automaticamente e resta modificabile, e
l'analisi si aggiorna dal vivo. Un pannello di analisi mostra coverage, speed tier e la scorecard
delle minacce; un pannello copilota elenca i suggerimenti per i posti vuoti con la loro motivazione,
e un clic aggiunge il suggerito al primo slot libero. In cima restano l'import di un team Showdown,
che riempie gli slot, e l'export e il salvataggio, identici alla modalità Genera. Tutto gira nel
browser: le due funzioni nuove sono chiamate come le altre del motore, senza backend.

## Passi realizzativi previsti

La realizzazione procede aggiungendo prima `src/builderAnalysis.ts` con `analyzeTeam` e
`suggestNextPicks` e i relativi test, poiché sono pura logica riusabile e testabile con fixture e con
il roster reale. Segue la scheda Costruisci in `web/` collegata a queste funzioni e a quelle già
esistenti per set, export e salvataggio. Infine la spiegazione narrativa e, come fast-follow, il
confronto tra varianti. Ogni passo mantiene verde la suite e il typecheck, e la resa dell'interfaccia
si verifica con uno screenshot come per la migrazione.

[^1]: *@smogon/calc* - la libreria MIT che implementa la formula del danno delle generazioni Pokémon,
la stessa del calcolatore ufficiale Smogon, usata dall'app per i numeri di danno reali.
