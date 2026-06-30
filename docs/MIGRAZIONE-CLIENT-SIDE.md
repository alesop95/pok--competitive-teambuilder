# Migrazione client-side: cosa significa, perché conviene, come funziona

> Documento formativo e tracciato. Nasce dalla decisione di portare l'app da un backend Node che
> esegue il motore a una applicazione che gira interamente nel browser, e dalla scelta del modo in cui
> farlo. Spiega ogni concetto senza darlo per scontato: cos'è una SPA[^1] statica, perché entrambe le
> opzioni considerate sono una SPA statica, perché la scelta non cambia il deploy né i costi, e come
> funziona il bundle[^2] quando il motore vive nel browser, incluso il motivo per cui può restare in
> cache. La decisione sintetica e le sue conseguenze stanno in ADR-011; qui c'è il ragionamento esteso.

## Da dove veniamo e dove andiamo

L'app oggi ha due metà che girano in due posti diversi. La prima è il motore, cioè il codice
TypeScript[^3] sotto `src/` che tagga i ruoli, calcola il danno con `@smogon/calc`, genera i team e
costruisce i set. La seconda è l'interfaccia, cioè la pagina in `src/public/index.html` che mostra i
risultati. Nel modello attuale il motore gira su un server Node con Fastify, e l'interfaccia nel
browser gli parla via rete: ogni volta che premi genera, il browser manda una richiesta HTTP[^4] al
server, il server esegue il motore e rimanda indietro i team in JSON[^5]. Il server è quindi
necessario perché è lì che il motore vive.

La migrazione sposta il motore dentro il browser. Invece di chiamare un server, l'interfaccia importa
il motore come modulo e lo esegue direttamente sulla macchina dell'utente. I file di dati di stagione,
che il server leggeva dal disco, diventano file scaricati dal browser via `fetch`. Lo storico dei team
salvati, che il server scriveva su disco, finisce in un piccolo database interno al browser, IndexedDB[^6].
Il risultato è che non serve più alcun server: l'app è un insieme di file statici, e tutto il lavoro
avviene nel browser di chi la usa.

## Cos'è una SPA statica

Una applicazione web si dice a pagina singola, SPA, quando il browser carica una sola pagina HTML[^7]
e da lì in poi è il JavaScript[^8] a cambiare ciò che vedi, aggiornando il contenuto senza ricaricare
una pagina nuova dal server a ogni clic. Le quattro schede dell'app, setup stagione, editor meta,
genera team e storico, non sono quattro pagine diverse servite dal server: sono quattro viste della
stessa pagina, mostrate e nascoste dal JavaScript. Questo è già vero oggi in `src/public/index.html`.

Una applicazione si dice statica quando i file che il browser scarica, cioè l'HTML, il JavaScript, il
CSS[^9] e i dati, sono file fissi che non vengono generati da un programma sul server al momento della
richiesta, ma esistono già pronti e vengono semplicemente consegnati così come sono. Un host statico è
un servizio che sa fare solo questo, consegnare file, e non esegue codice lato server. Proprio perché
non esegue codice, un host statico è semplice, veloce, e quasi sempre gratuito.

Mettendo insieme i due aggettivi, una SPA statica è una applicazione a pagina singola fatta solo di
file fissi, dove tutta la logica vive nel JavaScript che gira nel browser. È esattamente ciò a cui
puntiamo: una volta tolto il server, l'app è un pacchetto di file fissi e tutto il calcolo, motore
incluso, avviene client-side, cioè nel browser dell'utente.

## Perché entrambe le opzioni di interfaccia sono una SPA statica

La scelta su cui si è ragionato non riguarda l'architettura, ma solo lo strumento con cui scrivere
l'interfaccia: tenere la pagina vanilla[^10] attuale e collegarla al motore, oppure riscrivere
l'interfaccia con React[^11]. È importante capire che questa scelta non tocca la natura statica
dell'app, e il motivo è preciso.

React non è un programma che gira su un server. È una libreria JavaScript che gira nel browser:
descrive l'interfaccia come componenti e si occupa di aggiornare ciò che vedi quando i dati cambiano.
Quando si pubblica una app React, uno strumento di build, nel nostro caso Vite[^12], prende il codice
dei componenti e lo trasforma in normali file statici, un HTML che fa da contenitore e dei file
JavaScript che contengono React più la logica dell'app. Quei file vengono poi consegnati dal browser
esattamente come quelli della versione vanilla. In altre parole, sia la pagina vanilla sia una
versione React diventano, dopo il build, lo stesso tipo di artefatto: una SPA statica di file fissi
con il lavoro che avviene nel browser. La differenza tra le due strade è solo come è scritto il codice
sorgente dell'interfaccia, non cosa viene pubblicato né dove gira.

Questo è il motivo per cui la scelta dello strumento di interfaccia è reversibile e non vincolante:
poiché entrambe producono una SPA statica sopra lo stesso scaffold Vite, si può iniziare con la pagina
vanilla e, se un domani l'interfaccia cresce, introdurre React sopra lo stesso impianto senza rifare
l'architettura.

## Perché il deploy e i costi non cambiano tra le due opzioni

Il deploy, cioè la pubblicazione, dipende da cosa devi ospitare, non da come hai scritto il codice
sorgente. Siccome dopo il build entrambe le opzioni sono la stessa cosa, una manciata di file statici,
ciò che devi ospitare è identico nei due casi: dei file da consegnare. Per consegnare file statici
basta un host statico, e gli host statici gratuiti adatti a un repository pubblico sono GitHub
Pages[^13] e Cloudflare Pages[^14]. Non serve un host che esegua codice lato server, perché non c'è
più codice lato server da eseguire: il motore gira nel browser dell'utente, non su una macchina che
paghi tu.

Da qui discende il costo. Un host che esegue codice, come Render nel piano gratuito, ha vincoli e
fastidi propri di chi deve tenere acceso un processo: si addormenta dopo un periodo di inattività e si
risveglia con un ritardo di trenta o cinquanta secondi, e il suo disco non sopravvive a un nuovo
deploy. Un host statico non ha nulla di tutto questo, perché non tiene acceso alcun processo: serve
file e basta, senza risvegli e senza limiti di esecuzione. Per questo la via statica è gratuita in
modo pieno e stabile, e per questo nel modello client-side il backend Render diventa un fallback non
necessario. La scelta tra pagina vanilla e React, ripetiamo, non incide su nessuno di questi punti,
perché a valle del build l'oggetto da ospitare è lo stesso.

## Come funziona il bundle client-side e perché può restare in cache

Quando si dice che il motore gira nel browser, in pratica significa che tutto il codice del motore e
delle librerie da cui dipende, tra cui i dati di gioco di `@pkmn/dex`, la mod `champions` di
`@pkmn/mods` e il calcolatore di danno `@smogon/calc`, viene impacchettato in alcuni file JavaScript.
Questa operazione di impacchettamento è il bundling, e Vite è lo strumento che la esegue: parte dal
punto di ingresso dell'app, segue tutti gli import, e produce uno o più file, i bundle, che contengono
tutto il necessario perché l'app funzioni senza altre dipendenze a runtime.

Lo spike di fattibilità ha prodotto numeri concreti su questo punto. Il build separa il codice in più
bundle. Il chunk[^15] principale, che contiene la mod champions e la dex, pesa circa 6.7 megabyte non
compressi, che diventano circa 1.0 megabyte una volta compressi per il trasferimento. Il chunk dei
learnset, cioè i movepool, pesa circa 3.2 megabyte non compressi e circa 0.4 compressi, ed è caricato
solo quando serve grazie a uno split automatico. Il resto, motore e interfaccia, sta sotto il
megabyte compresso. In totale il browser scarica circa 1.9 megabyte compressi, a fronte di circa 12
megabyte non compressi. La compressione conta perché i server, inclusi gli host statici, inviano i
file in forma compressa e il browser li decomprime: la cifra che viaggia davvero in rete è quella
compressa, intorno ai due megabyte.

Sul fatto che il bundle possa restare lì, cioè restare disponibile senza riscaricarlo ogni volta, la
risposta è sì, ed è uno dei vantaggi della via statica. Il browser tiene una cache[^16] dei file che
scarica: la prima volta che apri l'app, scarica i bundle e li conserva; le volte successive li riusa
dal disco locale senza richiederli di nuovo alla rete, finché non cambiano. Gli strumenti di build
moderni rafforzano questo comportamento con una tecnica chiamata hashing del nome del file: ogni
bundle viene pubblicato con un nome che contiene un codice derivato dal suo contenuto, per esempio
`index-DfdwA4rH.js`. Finché il contenuto non cambia, il nome non cambia e il browser continua a usare
la copia in cache; quando aggiorni il codice e ripubblichi, cambia il contenuto, quindi cambia il
nome, e il browser scarica solo i bundle effettivamente cambiati invece di tutto. Il risultato è che
i circa due megabyte sono un costo di rete una tantum: si pagano alla prima visita e poi, nella
pratica, non più, il che rende del tutto accettabile il peso per un tool di nicchia. Se in futuro si
volesse anche il funzionamento offline, cioè l'app utilizzabile senza connessione dopo la prima
visita, lo si potrebbe ottenere con un service worker[^17], ma non è necessario ora.

## A che punto è la migrazione

La migrazione segue le fasi fissate in ADR-009. La prima fase, astrarre l'accesso ai dati del motore
dietro un'interfaccia comune così che il motore non dipenda dal filesystem, è completata: esiste
`src/dataSource.ts` con le due implementazioni `src/nodeDataSource.ts` per il CLI e
`src/browserDataSource.ts` per il browser, quest'ultima con lettura via `fetch` e storico su IndexedDB.
La seconda fase, lo spike per verificare che il motore si impacchetti per il browser e misurarne il
peso, è conclusa con esito positivo, con i numeri riportati sopra e una generazione reale di tre team
in circa 650 millisecondi eseguita interamente nel browser. La terza e la quarta fase, il porting
dell'interfaccia delle quattro pagine sopra lo scaffold Vite con la persistenza su IndexedDB, sono
fatte: l'app vive in `web/` (`web/index.html` riusa il markup della SPA, `web/main.ts` chiama
direttamente le funzioni del motore al posto dell'API REST), e il riscontro nel browser ha confermato
setup, generazione, vincoli iniziali e import/export funzionanti senza backend. La scelta documentata
in ADR-011 è di portare la pagina vanilla esistente, mantenendo React come evoluzione opzionale futura
sopra lo stesso scaffold. Resta operativa solo l'abilitazione di Pages lato repository, descritta sotto.

## Pubblicazione su GitHub Pages (fase 5)

La pubblicazione è automatizzata e gratuita. Un sito di progetto su GitHub Pages vive sotto un
sottopercorso del tipo `https://<utente>.github.io/<repo>/`, quindi gli URL degli asset e dei dati
devono includere quel prefisso. Per questo `vite.config.ts` imposta `base` al nome del repository nella
build di produzione, e `web/main.ts` legge la radice dei dati da `import.meta.env.BASE_URL`, la
variabile che Vite valorizza con quel prefisso, così il `fetch` dei file di stagione segue lo stesso
percorso degli asset senza scriverlo a mano. In sviluppo, dove non c'è sottopercorso, il valore è
semplicemente la barra.

Il build si lancia con `npm run build:web`, che produce la cartella `web/dist` con l'HTML, i bundle e
i dati di stagione copiati come asset statici. Il workflow `.github/workflows/deploy.yml` esegue
esattamente questo a ogni push su `main`: installa le dipendenze, builda e pubblica `web/dist` su
Pages usando le azioni ufficiali. L'unico passo manuale, da fare una volta sola, è abilitare la
pubblicazione nelle impostazioni del repository, alla voce Pages, scegliendo come sorgente GitHub
Actions; da lì in poi ogni push aggiorna il sito da solo. Per provare la build di produzione in locale
prima di pubblicare si usano `npm run build:web` e poi `npm run preview:web`, ricordando che in
modalità produzione l'app vive sotto il sottopercorso del repository anche nel server di anteprima.

Il backend Fastify in `src/server.ts` resta valido per l'uso locale come server, ma non è necessario
alla versione pubblicata: la pagina statica con il motore client-side è autosufficiente, e il fallback
su Render descritto in `docs/DEPLOY.md` non serve finché il modello client-side regge.

[^1]: *SPA*, Single Page Application - applicazione web in cui il browser carica una sola pagina e il
resto avviene aggiornando quella pagina via JavaScript, senza ricaricare pagine nuove dal server.

[^2]: *Bundle* - file unico (o pochi file) prodotto impacchettando insieme il codice dell'app e tutte
le librerie da cui dipende, così che il browser carichi tutto il necessario senza dipendenze esterne.

[^3]: *TypeScript* - linguaggio che estende JavaScript con i tipi statici; viene compilato in
JavaScript per girare nel browser o in Node.

[^4]: *HTTP*, HyperText Transfer Protocol - protocollo con cui browser e server si scambiano richieste
e risposte sul web.

[^5]: *JSON*, JavaScript Object Notation - formato testuale per scambiare dati strutturati, usato qui
per i team restituiti dall'API.

[^6]: *IndexedDB* - database integrato nel browser, persistente sul dispositivo dell'utente, usato qui
per salvare lo storico dei team al posto del filesystem.

[^7]: *HTML*, HyperText Markup Language - linguaggio con cui si descrive la struttura di una pagina web.

[^8]: *JavaScript* - linguaggio di programmazione che il browser esegue, su cui si basa tutta la logica
client-side.

[^9]: *CSS*, Cascading Style Sheets - linguaggio con cui si descrive l'aspetto grafico di una pagina.

[^10]: *vanilla* - aggettivo che indica codice scritto senza framework, qui JavaScript puro nel file
`src/public/index.html`.

[^11]: *React* - libreria JavaScript per costruire interfacce a componenti; gira nel browser, non sul
server.

[^12]: *Vite* - strumento di build e sviluppo per app web: impacchetta il codice in file statici e
offre un server di sviluppo veloce.

[^13]: *GitHub Pages* - servizio gratuito di GitHub che pubblica file statici da un repository, su
account Free funziona con repository pubblici.

[^14]: *Cloudflare Pages* - servizio gratuito di Cloudflare per pubblicare siti statici, con rete di
distribuzione globale.

[^15]: *chunk* - uno dei file in cui il bundler suddivide il codice; separare in chunk permette di
caricare alcune parti solo quando servono.

[^16]: *cache* - memoria locale in cui il browser conserva i file scaricati per riusarli senza
richiederli di nuovo alla rete.

[^17]: *service worker* - script che il browser esegue in background e che può intercettare le
richieste di rete, abilitando tra l'altro il funzionamento offline.
