# Stack di pubblicazione: dove e come vive l'app

> Documento tracciato. Spiega in modo discorsivo dove l'applicazione viene effettivamente pubblicata,
> cosa significano i termini del processo (bundle, spike, scaffolding e simili), e che ruolo ha
> Render in tutto questo. Complementa `docs/TECHNICAL.md` e `docs/WALKTHROUGH.md`. La decisione di
> fondo è registrata in `.claude/memory/decisions.md` come ADR-009.

## L'obiettivo e la forma scelta

Il vincolo è che l'app viva gratuitamente e in modo stabile da qualche parte. La forma scelta per
ottenerlo è una applicazione a pagina singola[^spa] che esegue tutto il motore direttamente nel
browser di chi la usa, senza un server applicativo proprio. Questo è possibile perché le librerie su
cui il motore si appoggia, `@pkmn/dex`, `@pkmn/mods`, `@smogon/calc` e `@pkmn/data`, sono le stesse
che alimentano il calcolatore web ufficiale di Smogon, e quindi funzionano nel browser. Spostando il
calcolo dal lato server al lato client si elimina il server, e con esso il suo costo e i suoi tempi
morti.

## Dove avviene davvero il deploy

Il deploy avviene su un servizio di hosting statico, cioè un servizio che si limita a consegnare al
browser dei file già pronti, senza eseguire codice applicativo lato server. I candidati sono
Cloudflare Pages e GitHub Pages, entrambi gratuiti; GitHub Pages è immediato perché il repository è
già pubblico. Concretamente, la pubblicazione consiste nel caricare su quel servizio l'insieme di
file che compongono la pagina, cioè l'HTML, il foglio di stile, il pacchetto JavaScript del motore e
i file di dati della stagione. Da quel momento il servizio espone un indirizzo pubblico e serve quei
file a chiunque lo apra, distribuendoli dalla sua rete[^cdn]. Non c'è un processo che gira sul
server: la pagina, una volta scaricata, esegue tutto nel browser dell'utente.

La persistenza dei team salvati vive anch'essa nel browser, in un archivio locale chiamato
IndexedDB[^idb], non in un database remoto. Ogni utente conserva i propri team sulla propria
macchina, il che è coerente con l'assenza di un server e con il requisito di gratuità, perché non
serve pagare né mantenere alcun database.

## Cosa c'entra Render

Render è una piattaforma che ospita servizi con un backend, cioè un processo applicativo che gira di
continuo su un server e risponde alle richieste. Era nel quadro come ipotesi alternativa, perché
offre un piano gratuito reale per applicazioni Node come il nostro server Fastify attuale. Nella
forma scelta, però, Render non viene usato: dato che il motore gira nel browser, non serve alcun
backend, e quindi nessun servizio Render. Render resta solo come piano di riserva, da attivare
unicamente se il pacchetto del motore nel browser risultasse troppo pesante o problematico: in quel
caso il calcolo tornerebbe su un backend Node ospitato gratis su Render, con il limite noto che il
suo piano gratuito mette il servizio in pausa dopo quindici minuti di inattività e il primo accesso
successivo attende qualche decina di secondi per il risveglio. Il file `render.yaml` in radice
descrive proprio questa riserva. In sintesi, oggi il deploy è statico e Render non interviene; Render
diventerebbe rilevante solo nel ramo di fallback.

## Il processo, dai sorgenti alla pagina pubblicata

Il percorso ha tre momenti distinti. Il primo è la preparazione dei dati: gli script di scraping
(`npm run roster`, `npm run legality`) girano in locale con Node e producono i file di dati della
stagione, che vengono versionati nel repository; questo lavoro avviene una volta per stagione e non a
ogni visita. Il secondo è la costruzione del pacchetto, il cosiddetto bundle: uno strumento di build,
Vite[^vite], prende i sorgenti TypeScript del motore e dell'interfaccia e li compila e impacchetta in
pochi file statici ottimizzati, risolvendo le dipendenze e minimizzando il codice; il risultato è la
cartella di file che verrà pubblicata. Il terzo è la pubblicazione vera e propria: quei file statici
vengono caricati sull'hosting statico, manualmente o agganciati al repository, e da lì sono serviti.

Tre termini ricorrono e vale la pena fissarli. Il bundle è il pacchetto di file prodotto dalla build,
ciò che effettivamente si pubblica. Lo scaffolding è la creazione dell'impalcatura iniziale del nuovo
progetto frontend, cioè la struttura di cartelle e file minima da cui si parte a costruire
l'interfaccia. Lo spike è una prova tecnica mirata e usa-e-getta che si fa prima di impegnarsi, per
verificare un'incognita: qui lo spike serve a bundlare il motore per il browser e misurare quanto
pesa davvero il pacchetto, perché i dati della mod del formato sono voluminosi, così da confermare
che la via client-side è praticabile prima di costruirci sopra l'interfaccia.

## Le fasi della migrazione

Il passaggio dall'attuale server Node a questa forma statica procede per fasi, ciascuna verificabile.
Prima si astrae l'accesso ai dati del motore dietro una interfaccia comune, così che lo stesso codice
possa leggere i dati dal filesystem quando gira con Node, oppure via rete quando gira nel browser,
senza riscrivere la logica. Poi si esegue lo spike sul peso del bundle. Quindi si crea l'impalcatura
del frontend con Vite e si fa eseguire il motore nel browser. Si portano poi le quattro pagine
dell'interfaccia e si aggiunge la persistenza con IndexedDB. Infine si configura l'hosting statico.
Lo stato di avanzamento di queste fasi vive in `.claude/memory/progress.md` e in
`.claude/context/current-work.md`.

[^spa]: *SPA*, Single Page Application - applicazione web servita come un'unica pagina che aggiorna i
contenuti via JavaScript senza ricaricare, invece di navigare tra pagine generate dal server.
[^cdn]: *CDN*, Content Delivery Network - rete di server distribuiti geograficamente che serve i file
statici dal nodo più vicino all'utente.
[^idb]: *IndexedDB* - archivio dati locale del browser, persistente sulla macchina dell'utente, usato
qui per conservare i team salvati senza un database remoto.
[^vite]: *Vite* - strumento di build e bundling per applicazioni web moderne, usato per compilare e
impacchettare i sorgenti nel pacchetto statico da pubblicare.
