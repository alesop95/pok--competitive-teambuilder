# Prompt riusabile — Inizializzazione di un PROGETTO NUOVO (greenfield)

> Da incollare in Claude Code dentro la radice di un progetto nuovo o quasi vuoto.
> È un prompt fisso: si usa sempre identico. La fonte di verità dello standard vive nel
> bundle di riferimento in E: e non va modificata da qui; questo prompt la importa e basta.

---

Voglio inizializzare in questo progetto il sistema portabile di contesto, documentazione e
version control. La fonte di verità dello standard è il bundle di riferimento qui:

```
E:\template-claude-developing\.claude
```

Procedi così, fermandoti a chiedere conferma prima di ogni azione difficilmente reversibile o
che tocca il version control. Non eseguire mai `git add`, `commit` o `push`: prepari i file e
lascio a me le operazioni git.

1. Importa il bundle portabile dalla cartella di riferimento dentro il `.claude` di questo
   progetto, senza sovrascrivere nulla in silenzio. Copia soltanto i file che costituiscono lo
   standard e il motore, NON il materiale legato all'account o alla macchina:
   - `PROJECT-SYSTEM.md` (la fonte di verità della procedura)
   - l'intera cartella `rules/`
   - le skill del motore, del flusso git e di onboarding sotto `skills/`: `init-project-system`,
     `sync-context`, `git-sync`, `repo-status`, `onboard`
   - l'intera cartella `templates/` (scheletri canonici dell'anatomia da istanziare)
   NON copiare `settings.local.json` né eventuali `memory/` o `context/` del progetto di
   riferimento: la memoria e le schede di questo progetto si creano qui da zero, istanziando i
   template. Il `settings.json`, il `CLAUDE.md` e l'anatomia si generano da `templates/`, non si
   prendono dal progetto di riferimento.
   Su Windows usa PowerShell con `Copy-Item`; mostrami prima cosa intendi copiare e dove, poi
   procedi su mia conferma.

2. Verifica che `PROJECT-SYSTEM.md` sia ora presente sotto `.claude/`. Se manca, fermati e
   segnalalo: senza il file portabile il sistema non si può installare.

3. Invoca la skill `init-project-system` in modalità greenfield. La skill è la procedura
   autoritativa: eseguila passo per passo come descritto, in particolare
   - Passo 0: verifica quale account Claude Code è attivo su questa macchina (setup
     multi-account via `CLAUDE_CONFIG_DIR`) e, se ne risulta più di uno, chiedimi con quale
     account voglio inizializzare prima di proseguire; chiedimi inoltre se sviluppo su Windows o su
     Linux, perché da questo dipendono `core.sshCommand`, gli script di setup e build, gli
     strumenti di igiene dell'account (`.ps1` su Windows, `.sh` su Linux) e la sintassi degli hook,
     e da lì in poi usa la variante corretta; subito dopo esegui il check di igiene dell'account
     con `templates/tools/check-account-hygiene` (`.ps1` su Windows, `.sh` su Linux), che verifica
     che l'account attivo abbia `autoMemoryEnabled: false` e l'hook `SessionEnd` di wipe del
     magazzino nascosto (sezione 15 di `PROJECT-SYSTEM.md`); se il check restituisce FAIL,
     segnalamelo e proponimi di installare lo script `templates/tools/session-end-wipe` della
     variante scelta nella home dell'account e di registrarne l'hook, senza modificare il
     `settings.json` dell'account senza mia conferma;
   - Passo 0.5: chiedimi quale identità git usare per i futuri commit e a quale repository
     GitHub agganciare il remoto, configurandola a livello locale secondo
     `rules/git-identity-and-repo.md`;
   - Passi 1-8 (sezione 10 di `PROJECT-SYSTEM.md`): scansione segreti, `.gitignore` (unendo
     `templates/gitignore.snippet`), anatomia minima di `.claude`, `CLAUDE.md` con la procedura
     di ripresa della sezione 12, `_notes/`, installazione delle skill, schede `context/` con il
     solo frontmatter di riconciliazione ancorato al commit corrente, prima voce in
     `memory/progress.md` e snapshot in `memory/index.md`. Dove esistono i template sotto
     `.claude/templates/`, istanziali secondo `templates/README.md` sostituendo i segnaposto,
     invece di ricostruire il contenuto a memoria.

4. Non popolare le schede con contenuto inventato in fase di init: creale con struttura e
   frontmatter, i `covers-paths` si affinano man mano che mappiamo il codice nelle sessioni
   successive. Crea anche lo stub di `CLAUDE.local.md` (ignorato) nella radice. Istanzia inoltre
   `_notes/RESUME-PROMPT.md` dal template omonimo sotto `templates/_notes/`: e il prompt di ripresa
   della sessione, privato e ignorato, da aggiornare alla fine di ogni sessione con lo stato
   raggiunto e con il prompt da incollare alla riapertura.

   Sull'MCP chiedimi sempre esplicitamente, non assumere: "Vuoi configurare un server MCP per
   questo progetto?". Se sì, crea `.mcp.json` e la cartella `mcp/` in radice, mai sotto `.claude`,
   istanziando il template opzionale `templates/mcp.json`. Se no, non crearli ora ma lasciami un
   promemoria esplicito che potrò aggiungerli in seguito rieseguendo questo passo.

5. Poiché in greenfield non c'è ancora un commit, i campi commit del frontmatter e il commit di
   riferimento in `memory/index.md` restano al segnaposto `PENDING-FIRST-COMMIT`. Dopo che io ho
   fatto il primo commit, ricordami di eseguire la skill `sync-context`: sostituirà ogni
   `PENDING-FIRST-COMMIT` con l'hash reale di HEAD, ancorando il sistema al codice.

6. Auto-memory nativa: gate esplicito e magazzino nascosto pulito (vedi sezione 15 di
   `PROJECT-SYSTEM.md`). Voglio che l'unica memoria di questo progetto viva dentro la cartella di
   progetto, sotto `.claude/memory/` versionata e in `_notes/RESUME-PROMPT.md` ignorato. All'avvio
   chiedimi sempre, senza assumere, come gestire la auto-memory nativa di Claude Code per questa
   sessione:
   - (a) lasciarla disattivata con `"autoMemoryEnabled": false` (default consigliato; il template
     lo prevede già, verifica che il flag sia presente dopo l'istanziazione del `settings.json`);
   - (b) attivarla temporaneamente portando il flag a `true`, a livello account o di progetto, con
     l'impegno a riportarlo a `false` prima che io chiuda la sessione o cambi progetto.
   Verifica inoltre che la cartella nascosta `$CLAUDE_CONFIG_DIR/projects/<slug>/memory/` di questo
   progetto sia vuota; se contiene residui di auto-memory di sessioni precedenti, elencameli e
   chiedimi se rimuoverli con il wipe della sezione 15, senza cancellare nulla in silenzio.

Alla fine dammi un riepilogo di cosa hai creato, cosa hai lasciato da fare, e i comandi git
manuali che devo eseguire io per il primo commit.
