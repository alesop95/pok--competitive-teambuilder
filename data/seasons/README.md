# Dati di stagione

> Tracciato. Una cartella di dati curati che evolve stagione per stagione (handoff §3.2, §3.3, §8).
> Il codice non cambia tra una stagione e l'altra: cambiano solo questi file.

## File per stagione

```
season_<id>.json        roster dei Pokémon disponibili nella stagione (es. season_MB.json)
season_<id>_meta.yaml    meta corrente: top_threats, common_cores, speed_benchmarks, note
```

Lo schema di `season_<id>.json` e di `season_<id>_meta.yaml` è descritto nell'handoff §3.2 e §3.3.

## Fonti dati di stagione (serebii.net) - da rileggere a ogni aggiornamento del roster

Queste pagine sono la fonte autorevole da cui si compila il roster, le mosse e gli strumenti
disponibili nella stagione corrente. Vanno riconsultate ogni volta che la stagione cambia, prima di
rigenerare `season_<id>.json`. Sono materiale di riferimento, non dipendenze di codice.

```
Pokémon disponibili        https://www.serebii.net/pokemonchampions/pokemon.shtml
Mosse usabili              https://www.serebii.net/pokemonchampions/moves.shtml
Attacchi (aggiornati)      https://www.serebii.net/pokemonchampions/updatedattacks.shtml
Strumenti disponibili      https://www.serebii.net/pokemonchampions/items.shtml
```

Le regole fini del formato (legalità mosse/abilità, sistema Stat Points) restano coperte dalla mod
`champions` di Pokémon Showdown (ADR-005); serebii.net fornisce l'elenco di disponibilità di
stagione che la community/gioco espone, da incrociare con la mod.

## Procedura di aggiornamento stagionale (handoff §8)

A ogni nuova stagione il lavoro si riduce a: rileggere le pagine serebii.net qui sopra e aggiornare
`season_<nuovo_id>.json` col nuovo roster; aggiornare `season_<nuovo_id>_meta.yaml` con minacce e
archetipi osservati nel meta; tag di stagione git `season-<id>` sul commit corrispondente. Nessuna
modifica al codice, salvo ability/meccaniche mai viste prima che richiedano un nuovo tag in §4.1.
