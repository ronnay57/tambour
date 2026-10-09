# Architecture

## Choix techniques

| Sujet | Choix | Pourquoi |
| --- | --- | --- |
| Langage | JavaScript moderne (modules ES), JSDoc pour les types | Simple à lire, pas d'étape de compilation lourde |
| Outil de build | [Vite](https://vitejs.dev) | Démarrage instantané, build optimisé, déploiement statique facile |
| Audio | Web Audio API | Latence faible, lecture simultanée de nombreux sons, effets |
| Interface | HTML + CSS (variables CSS), sans framework | Le site est une seule page interactive ; un framework n'apporterait pas grand-chose |
| Hébergement | GitHub Pages | Gratuit, lié au dépôt |

Ces choix peuvent évoluer ; toute modification est notée ici avec sa raison.

## Organisation des dossiers

```
tambour/
├── index.html            Page unique
├── public/sounds/
│   ├── README.md         Liste des kits, des pièces et de leurs identifiants
│   ├── acoustic/         Batterie acoustique (échantillons VCSL, CC0)
│   ├── world/            Percussions du monde (échantillons VCSL, CC0)
│   ├── electronic/       Batterie électronique façon 808/909 (synthèse)
│   └── synth/            Batterie synthétique (secours, mêmes pièces qu'acoustic)
├── tools/
│   └── sounds/           Import des échantillons VCSL et synthèse des kits (Python + ffmpeg)
├── src/
│   ├── main.js           Point d'entrée : assemble les modules
│   ├── music.js          Boucles, choix du kit et enregistrement autour du moteur
│   ├── audio/
│   │   ├── engine.js     Contexte audio et lecture : engine.play(soundId, velocity, time), time sur engine.now()
│   │   ├── sample-loader.js Charge les sons d'un kit d'après public/sounds/<kit>/manifest.json
│   │   ├── reverb.js     Réverbération de pièce calculée, réglée par engine.setReverb
│   │   ├── drum-synth.js Sons de synthèse de secours si un échantillon manque
│   │   ├── kits.js       Description des kits (pièces, fichiers, touches)
│   │   ├── kit-selector.js Charge le kit choisi ; le dernier choix l'emporte
│   │   ├── clock.js      Horloge du tempo, planifie chaque pas en temps audio avec une fenêtre d'avance
│   │   ├── patterns.js   Ambiances décrites comme des données (accords, basse, shaker, grille de batterie)
│   │   ├── synth.js      Basse, nappe, shaker et clic de métronome synthétisés
│   │   ├── loops.js      Lecteur de boucles et métronome
│   │   └── recorder.js   Enregistrement des frappes datées et réécoute
│   ├── input/
│   │   ├── keyboard.js   Touches clavier vers pièces
│   │   ├── pointer.js    Souris et toucher (multi-doigts)
│   │   └── midi.js       Pad ou clavier MIDI (notes de batterie General MIDI)
│   ├── ui/
│   │   ├── drum-kit.js   Affichage du kit : renderDrumKit(container, kit)
│   │   ├── kit-layout.js Placement de chaque pièce en paysage et en portrait (données)
│   │   ├── hit-animation.js Animations de frappe (Web Animations API) : animateHit(pieceId, velocity, point?)
│   │   ├── theme.js      Bascule thème clair/sombre, mémorisée dans le navigateur
│   │   ├── controls.js   Kit, boucle, tempo, métronome, enregistrement
│   │   └── preferences.js Préférences du joueur, gardées dans le navigateur
│   └── styles/
│       ├── tokens.css    Couleurs, typographies, espacements
│       └── main.css
├── vite.config.js        Configuration de Vite
├── eslint.config.js      Règles ESLint
├── .prettierignore       Exclut docs/ et *.md du formatage automatique
├── playwright.config.js  Configuration des tests navigateur
├── tests/                Tests unitaires (npm test)
│   └── e2e/              Tests navigateur et accessibilité (npm run test:e2e)
└── docs/
```

Chaque kit a un `manifest.json` (pièces, couches de vélocité, fichiers) lu par `audio/sample-loader.js`. Chaque fichier son est en `.ogg` avec un `.mp3` de secours.

## Page

`index.html` contient `<main id="stage">` avec le kit dans `#drum-kit`, et une zone `#transport` réservée aux contrôles de boucle et d'enregistrement (masquée tant qu'elle est vide). Chaque pièce affichée porte `data-piece-id`, ce qui permet à `input/pointer.js` de retrouver la pièce frappée.

## Principes

1. **L'audio ne dépend pas de l'interface.** `audio/` ne touche jamais au DOM. L'interface appelle le moteur, jamais l'inverse.
2. **Les entrées émettent des événements.** Clavier, pointeur et MIDI produisent un même événement `hit` (`{ pieceId, velocity }`), que `main.js` relie au moteur audio et à l'animation.
3. **Les kits sont des données.** Ajouter un kit revient à ajouter un dossier de sons et une entrée dans `kits.js`, sans toucher au reste du code.
4. **Le contexte audio démarre sur une action de l'utilisateur**, comme l'exigent les navigateurs (premier clic ou première touche).
5. **L'enregistrement garde les frappes, pas le son.** Chaque frappe est notée (pièce, vélocité, heure), ce qui permet une réécoute sans perte, éventuellement avec un autre kit.

## Flux d'une frappe

```
Touche / doigt / MIDI ──► input/* ──► événement "hit" ──► main.js ──┬──► audio/engine.play(soundId, velocity, time)
                                                                    ├──► ui/hit-animation.animateHit(pieceId, velocity, point)
                                                                    └──► music.captureHit(hit)   (enregistrement)
```

`main.js` initialise la partie musique avec `setupMusic({ engine, kits, root })`.
