# poke-competitive-teambuilder

> Istruzioni di team, versionate. Questo file è l'indice del progetto: indicizza i soli file
> satellite tracciati e descrive la procedura di ripresa. Le preferenze personali vivono in
> `CLAUDE.local.md`, ignorato da git, non qui.

## Cos'è questo progetto

App locale (Windows 11 / Linux, nessuna dipendenza cloud obbligatoria) che, dato il roster di
Pokémon disponibili in una stagione di Pokémon Champions, genera proposte di team competitivi con
ruoli, sinergie, coverage, tattica e counter. Ragiona per tag deterministici e copertura, non per
simulazione di combattimento. Lo studio di progetto completo, con stack e roadmap, è nell'handoff
`pokemon-champions-team-builder-spec.md` in radice; le decisioni di stack sono in
`.claude/context/STACK.md` e `.claude/memory/decisions.md`.

## Procedura di ripresa in una sessione nuova

Lo stato del progetto è interamente recuperabile su disco. All'inizio di una sessione si segue
questo percorso fisso. Si legge per primo `.claude/memory/index.md`, che dà branch, commit di
riferimento, stato di verifica di ogni scheda e punto di ripresa. Si legge poi
`.claude/context/current-work.md` se c'è una feature attiva, per sapere cosa è in lavorazione e
quali sono i TODO e le domande aperte. Si invoca la skill `sync-context` per verificare il drift
tra schede e codice, e si leggono solo le schede pertinenti al task, mai tutte insieme. Il
work-log `.claude/memory/progress.md` e il registro `.claude/memory/decisions.md` forniscono la
storia e le decisioni quando servono. Il materiale grezzo sotto `_notes/` si apre solo per
verificare un requisito originale. Per una ripresa rapida esiste `_notes/RESUME-PROMPT.md`, privato
e ignorato, mentre lo stato canonico resta `.claude/memory/index.md`.

## Indice dei file satellite tracciati

Memoria e meta-stato, sotto `.claude/memory/`, letti sempre a inizio sessione.

```
.claude/memory/index.md       snapshot e tabella di sincronizzazione, da leggere per primo
.claude/memory/progress.md    work-log append-only di passi e riconciliazioni
.claude/memory/decisions.md   registro ADR-lite delle decisioni architetturali
```

Schede tecniche, sotto `.claude/context/`, con frontmatter di riconciliazione.

```
.claude/context/STACK.md                stack, link open source, ruolo dei file, alternative escluse
.claude/context/design-and-security.md  pipeline del motore, paradigmi di design e sicurezza
.claude/context/deployment.md           livelli locale/web, comandi, segreti
.claude/context/dev-testing.md          test runner Vitest, fixture, controlli di qualità
.claude/context/current-work.md         feature attiva (Fase 0), definition of done, domande aperte
.claude/context/roadmap.md              fasi 0→5 e criterio di successo MVP
```

Regole modulari caricate su necessità sotto `.claude/rules/` (`interaction-style`,
`git-identity-and-repo`, `manual-screenshots`, `token-economy`), e skill richiamabili sotto
`.claude/skills/` (`init-project-system`, `sync-context`, `git-sync`, `repo-status`, `onboard`).
Lo standard di sistema completo è in `.claude/PROJECT-SYSTEM.md`. La specifica di progetto è in
`pokemon-champions-team-builder-spec.md` in radice.

## Sviluppo e identità

git locale, identità `alesop95`, alias SSH `github-personal`, remoto
`github.com/alesop95/pok--competitive-teambuilder` (repository pubblico, ADR-004). L'identità è
impostata a livello locale del repo secondo `.claude/rules/git-identity-and-repo.md`.

## Vincoli di team

Le operazioni di `git add`, commit e push restano sempre manuali dell'utente: l'agente prepara i
file, non committa. Lo stile di documentazione e di interazione è quello di
`.claude/rules/interaction-style.md`. Claude non scrive autonomamente nei file di memoria e di
contesto: li aggiorna solo su richiesta esplicita, così il versionamento resta sotto controllo
umano. L'auto-memory nativa è disattivata (`.claude/settings.json`, `autoMemoryEnabled: false`).
