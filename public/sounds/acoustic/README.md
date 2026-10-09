# Kit « Batterie acoustique »

Sons générés par synthèse avec [`tools/sound-synth/generate.py`](../../../tools/sound-synth/generate.py) : aucun échantillon externe, donc aucun problème de droits.

## Instruments et sons

| Pièce | Identifiant | Rôle dans le jeu | Sons |
| --- | --- | --- | --- |
| Grosse caisse | `kick` | Temps forts, pulsation | frappe au pied |
| Caisse claire | `snare` | Temps 2 et 4, roulements | frappe centrale |
| Caisse claire | `snare-rimshot` | Accents puissants | peau + cercle en même temps |
| Caisse claire | `snare-sidestick` | Ballades, bossa | baguette posée sur le cercle (cross-stick) |
| Tom aigu | `tom-high` | Breaks, fills | frappe |
| Tom médium | `tom-mid` | Breaks, fills | frappe |
| Tom basse | `tom-floor` | Breaks, grooves lourds | frappe |
| Charleston | `hihat-closed` | Subdivisions (croches, doubles) | fermé, à la baguette |
| Charleston | `hihat-open` | Accents, levées | ouvert, à la baguette |
| Charleston | `hihat-pedal` | Garder le temps au pied | refermé au pied |
| Crash | `crash` | Ponctuer un début de phrase | frappe sur le bord |
| Splash | `splash` | Accent court | frappe |
| Ride | `ride` | Alternative au charleston | frappe sur l'arc |
| Ride | `ride-bell` | Motifs latins, accents | frappe sur la cloche |
| Cloche | `cowbell` | Rythmes latins, funk | frappe |

## Fichiers

- Chaque pièce existe en **3 vélocités** (`v1` douce, `v2` moyenne, `v3` forte) et **2 variantes** par vélocité, pour éviter l'effet « mitraillette » quand on répète la même frappe : `kick-v3-2.ogg` = grosse caisse, frappe forte, variante 2.
- Formats : `.ogg` (Vorbis) et `.mp3` de secours, mono, 44,1 kHz.
- Chaque son commence à l'impact (aucun silence au début). Le volume est normalisé par pièce à -1 dBFS sur la frappe la plus forte ; les vélocités gardent leurs écarts de volume.
- [`manifest.json`](manifest.json) décrit le kit : pièces, nom affiché, gain de mixage conseillé (`gain`), vélocité maximale de chaque couche (`max`, entre 0 et 1) et fichiers (sans extension).

## Pour le moteur audio

- Choisir la couche dont `max` est la première supérieure ou égale à la vélocité, puis une variante au hasard, et moduler légèrement le gain avec la vélocité exacte.
- **Groupe d'étouffement du charleston** : `hihat-closed` et `hihat-pedal` doivent couper un `hihat-open` en cours, comme sur une vraie batterie.
- Les sons sont secs : la légère réverbération commune prévue dans [DESIGN.md](../../../docs/DESIGN.md) s'ajoute dans le moteur.

## Régénérer les sons

```sh
python3 tools/sound-synth/generate.py            # écrit dans public/sounds/acoustic/
python3 tools/sound-synth/generate.py --wav /tmp/wav   # garde aussi les .wav pour vérifier
```

Dépendances : Python 3 avec numpy, et ffmpeg compilé avec libvorbis et libmp3lame. Les graines aléatoires sont fixes : relancer le script redonne exactement les mêmes sons. Pour retoucher un son, modifier la fonction de la pièce dans le script (une fonction par pièce).

## Pour aller plus loin : échantillons enregistrés

La synthèse donne un kit cohérent et léger, mais des enregistrements de vraies batteries restent plus réalistes. Pistes libres de droits à évaluer pour un second kit, **licence à vérifier pour chaque pack avant import** et à noter dans `CREDITS.md` :

- [Freesound](https://freesound.org) avec le filtre de licence CC0 (aucune attribution requise).
- Les kits du logiciel [Hydrogen](http://hydrogen-music.org) (licences variables selon le kit).
- Le « Salamander Drumkit » (enregistrement multi-vélocités d'une batterie acoustique, licence Creative Commons à vérifier).
