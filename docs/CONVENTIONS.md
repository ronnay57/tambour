# Conventions

Le but : qu'on puisse ouvrir n'importe quel fichier et le comprendre en quelques minutes.

## Code

- **Langue** : le code (variables, fonctions, fichiers) est en anglais ; la documentation et les commentaires expliquant le « pourquoi » sont en français.
- **Un module, une responsabilité.** Un fichier dépasse rarement 200 lignes ; au-delà, on le découpe.
- **Nommage**
  - fichiers : `kebab-case.js`
  - fonctions et variables : `camelCase`
  - constantes globales : `UPPER_SNAKE_CASE`
  - fonctions qui agissent : un verbe (`playSound`, `loadKit`)
- **Exports nommés** uniquement, pas d'`export default`. Seule exception : les fichiers de configuration d'outils (`vite.config.js`, `eslint.config.js`), dont l'outil exige un export par défaut.
- **JSDoc** sur toute fonction exportée : rôle, paramètres, valeur de retour.
- **Pas de nombres magiques** : les valeurs (volumes, durées, tempo par défaut) sont des constantes nommées.
- **Commentaires** : ils expliquent pourquoi, pas ce que fait le code.
- **CSS** : toutes les couleurs, polices et espacements viennent de `styles/tokens.css`.

## Formatage et vérifications

- [Prettier](https://prettier.io) pour le formatage, [ESLint](https://eslint.org) pour les erreurs.
- `npm run lint` et `npm run format` doivent passer avant chaque commit.

## Git

- **Branches** : `main` est toujours stable. Le travail se fait sur des branches `feat/…`, `fix/…`, `docs/…`.
- **Commits** au format [Conventional Commits](https://www.conventionalcommits.org/fr/) :
  - `feat: ajoute le kit percussions du monde`
  - `fix: corrige la latence au premier toucher sur iOS`
  - `docs: précise le flux d'une frappe`
- **Pull requests** : une PR par fonctionnalité, décrite en « Avant / Après », relue avant fusion.
- **CHANGELOG.md** est mis à jour à chaque fonctionnalité visible.

## Sons

- Uniquement des échantillons libres de droits ; la source et la licence de chaque son sont notées dans `public/sounds/<kit>/CREDITS.md`.
- Format `.ogg` (avec `.mp3` de secours), normalisés au même volume, coupés sans silence au début.
