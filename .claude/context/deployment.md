---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - package.json
last-verified-commit: 61690d5
source-doc: pokemon-champions-team-builder-spec.md
---

# Deployment

> Struttura con i fatti noti dall'handoff §2.5. Commit, push e deploy restano operazioni manuali
> dell'utente. Il deploy web è Fase 5 opzionale: per ora l'app è solo locale.

## Livelli

L'MVP gira solo in locale, su Windows 11 e Linux, senza dipendenze cloud obbligatorie. Versionamento
su GitHub: repository pubblico `github.com/alesop95/pok--competitive-teambuilder` (ADR-004), con tag
di stagione `season-<id>` a ogni chiusura di stagione. Eventuale hosting futuro (Fase 5): frontend
statico su GitHub Pages (gratis, abilitato dal repo pubblico) o Cloudflare Pages; backend/API su
Render (free tier reale, cold start 30-50s dopo 15 min di inattività) oppure, data la natura
stateless delle richieste, Cloudflare Workers (nessun cold-start percepibile). Railway e Fly.io
sono esclusi perché dal 2026 non offrono più un tier sempre gratuito.

Nota tecnica per il deploy edge: su un runtime come Cloudflare Workers non esiste filesystem
persistente, quindi i file flat o `better-sqlite3` andrebbero sostituiti con uno storage compatibile
(Cloudflare D1 o Turso). Non è un problema ora: per l'app locale i file flat bastano.

## Comandi

```
npm install     installa le dipendenze e genera package-lock.json
npm run dev      avvia l'app web Fastify su http://127.0.0.1:5187 (override con PORT)
npm start        avvia l'app in modo identico a dev (usato anche dal deploy)
npm run generate genera i team da CLI e scrive report in data/generated_teams/
npm run roster   ri-scarica il roster di stagione da serebii in data/seasons/
npm run legality ri-scarica strumenti/mosse legali da serebii in data/seasons/legal_<id>.json
npm run check-mb verifica se c'è un aggiornamento dati M-B a monte (@pkmn/mods, Mega Z-A)
npm run creators mostra gli ultimi video dei content creator (RSS) da data/references/creators.json
npm run build    compila TypeScript in dist/ (typecheck/rilascio; per servire serve copiare public/data)
npm test         esegue la suite Vitest
```

Porta di default 5187 (scelta non comune per non collidere con altri localhost); sovrascrivibile
con la variabile d'ambiente `PORT`. Host di default `127.0.0.1`; in deploy va `0.0.0.0` (via `HOST`).

## Deploy web (Render, free tier)

Il file `render.yaml` in radice descrive un servizio web Render gratuito (handoff §2.5): build
`npm install`, start `npm start` (esegue `tsx src/server.ts`), `HOST=0.0.0.0` e `PORT` fornita da
Render. Si crea un Blueprint puntando alla repo; il deploy è manuale dell'utente. Caveat: free tier
si addormenta dopo 15 min (risveglio ~30-50s) e il filesystem non è persistente tra deploy, quindi i
team salvati a runtime non sopravvivono a un nuovo deploy (per persistenza: storage esterno, §2.5).
Alternativa desktop non implementata: packaging Tauri (richiede toolchain Rust), valutabile in
seguito.

## Variabili d'ambiente e segreti

```
ANTHROPIC_API_KEY   opzionale; abilita il rationale Livello 2 (§4.3). Vive in .env ignorato da git.
```

Nessun altro segreto. I valori non si committano mai; `.env` è in `.gitignore`.
