---
generated-from-commit: 373419b
generated-from-branch: main
generated-date: 2026-06-19
covers-paths:
  - package.json
last-verified-commit: 373419b
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
npm run dev      avvia l'app in sviluppo (tsx src/server.ts)
npm run build    compila TypeScript in dist/ (per un eventuale rilascio)
npm test         esegue la suite Vitest
```

## Variabili d'ambiente e segreti

```
ANTHROPIC_API_KEY   opzionale; abilita il rationale Livello 2 (§4.3). Vive in .env ignorato da git.
```

Nessun altro segreto. I valori non si committano mai; `.env` è in `.gitignore`.
