// Dichiarazioni ambient per i subpath di @pkmn/mods. La package.json del pacchetto non espone la
// condizione "types" per i subpath sotto "exports", quindi con moduleResolution NodeNext tsc non
// trova i .d.ts del subpath (TS7016). I dati della mod si usano comunque castati a ModData (come
// raccomandato dal README di @pkmn/mods), quindi qui basta dichiarare i moduli per silenziare la
// risoluzione mancante senza perdere la sicurezza dove conta.
declare module '@pkmn/mods/champions';
declare module '@pkmn/mods/championsregma';
