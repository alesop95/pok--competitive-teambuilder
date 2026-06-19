# Prompt riusabile — ALLINEAMENTO di un progetto ESISTENTE allo standard

> Da incollare in Claude Code dentro la radice di un progetto che ha già codice e storia git.
> È un prompt fisso: si usa sempre identico. La fonte di verità dello standard vive nel bundle
> di riferimento in E: e non va modificata da qui; questo prompt la importa e ci si confronta.

---

Questo progetto ha già codice e una storia git. Voglio allinearlo retroattivamente al sistema
portabile di contesto, documentazione e version control, senza riscrivere la storia git e senza
inventare contenuto. La fonte di verità dello standard è il bundle di riferimento qui:

```
E:\template-claude-developing\.claude
```

L'adozione è iterativa e va proposta, non imposta: nulla va sovrascritto in silenzio, ogni
passo che tocca git chiede la mia conferma, le schede si allineano poche alla volta. Non
eseguire mai `git add`, `commit` o `push`: prepari i file e lascio a me le operazioni git.

1. Importa nel `.claude` di questo progetto, senza sovrascrivere nulla in silenzio, solo i file
   dello standard e del motore dalla cartella di riferimento:
   - `PROJECT-SYSTEM.md` (la fonte di verità della procedura)
   - l'intera cartella `rules/`
   - le skill del motore, del flusso git e di onboarding sotto `skills/`: `init-project-system`,
     `sync-context`, `git-sync`, `repo-status`, `onboard`
   - l'intera cartella `templates/` (scheletri da cui istanziare solo le schede mancanti)
   Se uno di questi file esiste già nel progetto, NON sovrascriverlo: mostrami la differenza e
   chiedimi come procedere. NON copiare `settings.local.json` né la `memory/`/`context/` del
   progetto di riferimento. Mostrami prima cosa intendi copiare e dove, poi procedi su conferma.

2. Verifica che `PROJECT-SYSTEM.md` sia presente sotto `.claude/`. Se manca, fermati: senza il
   file portabile il confronto con lo standard non è possibile.

3. Invoca la skill `init-project-system` in modalità allineamento. Valgono comunque i Passi 0 e
   0.5 (account Claude attivo e identità git locale + remoto secondo
   `rules/git-identity-and-repo.md`). Al Passo 0, dopo aver determinato l'account attivo, chiedimi
   se sviluppo su Windows o su Linux, perché da questo dipendono `core.sshCommand`, gli script di
   setup e build, gli strumenti di igiene dell'account (`.ps1` su Windows, `.sh` su Linux) e la
   sintassi degli hook; poi esegui il check di igiene dell'account con
   `templates/tools/check-account-hygiene` nella variante del sistema scelto, che verifica che
   l'account abbia `autoMemoryEnabled: false` e l'hook `SessionEnd` di wipe del magazzino nascosto
   (sezione 15 di `PROJECT-SYSTEM.md`); se restituisce FAIL, segnalamelo e proponimi di installare
   `templates/tools/session-end-wipe` della stessa variante nella home dell'account e di
   registrarne l'hook, senza toccare il `settings.json` dell'account senza mia conferma. Poi segui
   la sezione 11 "Adozione su un progetto esistente" di `PROJECT-SYSTEM.md`:
   - fai un inventario di ciò che esiste già (`.claude/`, `CLAUDE.md`, `CLAUDE.local.md`,
     eventuali `.mcp.json` e `mcp/` in radice, documenti, `.gitignore`, configurazione di test e
     CI) e mappalo contro l'anatomia canonica della sezione 2, segnalando i divari senza
     toccarli; ricorda che `.mcp.json` e `mcp/` vivono in radice, mai sotto `.claude`;
   - esegui la scansione del version control e dei segreti della sezione 6, che qui pesa di più
     perché la storia è lunga e può contenere `.env` rimossi ma ancora recuperabili;
   - ricostruisci la memoria dalla storia senza inventare: `memory/decisions.md` con le
     decisioni implicite nei commit come voci ADR numerate, `memory/progress.md` con le tappe
     già fatte, `memory/index.md` come fotografia al commit corrente;
   - istanzia `_notes/RESUME-PROMPT.md` dal template omonimo sotto `templates/_notes/`: il prompt
     di ripresa privato e ignorato, da aggiornare alla fine di ogni sessione con lo stato raggiunto;
   - crea le schede di `context/` con il frontmatter di riconciliazione ancorato al commit
     corrente e popolale leggendo il codice ATTUALE (non la storia), una alla volta partendo
     dalle aree più critiche, con `covers-paths` sulle aree reali, appoggiandoti se attivo al
     server MCP `code-context` per ricavarne struttura e simboli (vedi punto 4);
   - dove un documento esistente copre già un'area, dotalo del frontmatter e riconcilialo
     invece di duplicarlo; dove un'area non è coperta da nulla, istanzia la scheda mancante dal
     template corrispondente sotto `.claude/templates/context/` e popolala leggendo il codice.
   Proponimi e allinea poche schede alla volta, chiedendo conferma su ogni passo che tocca git.

4. Sull'MCP chiedimi sempre esplicitamente, anche se il progetto esiste già da tempo, non
   assumere: "Vuoi configurare un server MCP per questo progetto?". In allineamento consigliami in
   particolare `code-context-provider-mcp`, già pronto in `templates/mcp.json`: si avvia via `npx`,
   non ha dipendenze native e dà struttura e simboli del codice, utile proprio per mappare un
   progetto esistente di cui non conosco la struttura. Se accetto e non esiste già, crea `.mcp.json`
   in radice, mai sotto `.claude`, istanziando la variante del sistema operativo
   (`templates/mcp.json` su Linux/macOS, `templates/mcp.windows.json` su Windows; per un server
   avviato via `npx` come questo NON serve la cartella `mcp/`, che riguarda solo i server
   implementati in proprio); se un `.mcp.json` esiste già, mostrami la differenza invece di sovrascrivere. Se
   rifiuto, lasciami un promemoria esplicito che potrò aggiungerlo in seguito.

5. Quando le schede hanno il frontmatter ancorato al commit corrente, invoca la skill
   `sync-context` per verificare il drift tra schede e codice e produrre il sync report. Da quel
   punto `last-verified-commit` coincide col commit corrente e il drift futuro si gestisce con
   `sync-context` come in un progetto nato col sistema.

6. Auto-memory nativa: gate esplicito e magazzino nascosto pulito (vedi sezione 15 di
   `PROJECT-SYSTEM.md`). Voglio che l'unica memoria di questo progetto viva dentro la cartella di
   progetto, sotto `.claude/memory/` versionata e in `_notes/RESUME-PROMPT.md` ignorato. Chiedimi
   sempre, senza assumere, come gestire la auto-memory nativa di Claude Code per questa sessione:
   - (a) lasciarla disattivata con `"autoMemoryEnabled": false` (default consigliato); se il
     `settings.json` esiste già e non ha il flag, mostrami la differenza e aggiungilo su mia
     conferma invece di sovrascrivere;
   - (b) attivarla temporaneamente portando il flag a `true`, a livello account o di progetto, con
     l'impegno a riportarlo a `false` prima che io chiuda la sessione o cambi progetto.
   Controlla poi se la cartella nascosta `$CLAUDE_CONFIG_DIR/projects/<slug>/memory/` contiene già
   file della auto-memory accumulati prima dell'allineamento; se sì, elencameli e chiedimi se
   rimuoverli con il wipe della sezione 15, senza cancellarli in silenzio.

Alla fine dammi: la mappa divari-vs-anatomia canonica, l'esito della scansione segreti, l'elenco
delle schede create o riconciliate con il loro stato, e i comandi git manuali che devo eseguire
io.
