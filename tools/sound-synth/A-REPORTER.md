# À reporter dans la documentation commune

Ces fichiers appartiennent au fil « Plan du projet » ; voici les ajouts proposés pour quand la PR des sons sera fusionnée.

## docs/ARCHITECTURE.md, organisation des dossiers

```
├── tools/
│   └── sound-synth/      Générateur des sons par synthèse (Python + ffmpeg)
```

Et dans `public/sounds/<kit>/` : un `manifest.json` décrit les pièces, couches de vélocité et fichiers du kit ; `kits.js` peut s'en servir directement.

## CHANGELOG.md, section « Ajouté »

- Kit « Batterie acoustique » : 15 sons (grosse caisse, caisse claire et ses variantes, 3 toms, charleston, crash, splash, ride, cloche) en 3 vélocités et 2 variantes, créés par synthèse.
