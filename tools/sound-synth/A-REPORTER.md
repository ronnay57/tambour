# À reporter dans la documentation commune

Ces fichiers appartiennent au fil « Plan du projet » ; voici les ajouts proposés pour quand la PR des sons sera fusionnée.

## docs/ARCHITECTURE.md, organisation des dossiers

```
├── public/sounds/
│   ├── README.md         Liste des kits, des pièces et de leurs identifiants
│   ├── acoustic/         Batterie acoustique (échantillons VCSL, CC0)
│   ├── world/            Percussions du monde (échantillons VCSL, CC0)
│   └── synth/            Batterie synthétique (secours, mêmes pièces qu'acoustic)
├── tools/
│   ├── sound-import/     Import et conversion des échantillons VCSL (Python + ffmpeg)
│   └── sound-synth/      Générateur des sons par synthèse (Python + ffmpeg)
```

Chaque kit a un `manifest.json` (pièces, couches de vélocité, fichiers) que `kits.js` peut lire directement.

## CHANGELOG.md, section « Ajouté »

- Kit « Batterie acoustique » : 15 pièces enregistrées (grosse caisse, caisse claire, rimshot, cross-stick, 3 toms, charleston fermé, ouvert et au pied, crash, splash, ride, cloche de ride, cowbell) en 3 vélocités, tirées de la bibliothèque libre VCSL.
- Kit « Percussions du monde » : bongos, congas, tumba, darbouka, cajón, tambours sur cadre et frappe de mains.
- Kit « Batterie synthétique » de secours, créé par synthèse.
