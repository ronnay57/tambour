# Sons du tambour

Trois kits, chacun dans son dossier avec un `manifest.json` (pièces, couches de vélocité, fichiers) et un `CREDITS.md` (source et licence de chaque son).

| Kit | Dossier | Origine | Licence |
| --- | --- | --- | --- |
| Batterie acoustique | `acoustic/` | Enregistrements de la [VCSL](https://github.com/sgossner/VCSL) | CC0 1.0 |
| Percussions du monde | `world/` | Enregistrements de la [VCSL](https://github.com/sgossner/VCSL) | CC0 1.0 |
| Batterie synthétique | `synth/` | Créés par synthèse pour ce projet, kit de secours | CC0 1.0 |

`acoustic` et `synth` ont exactement les mêmes pièces et les mêmes identifiants : on peut passer de l'un à l'autre sans rien changer d'autre.

## Batterie acoustique (`acoustic/`, et `synth/`)

| Pièce | Identifiant | Rôle dans le jeu | Son enregistré (VCSL) |
| --- | --- | --- | --- |
| Grosse caisse | `kick` | Temps forts, pulsation | Bass Drum 1 |
| Caisse claire | `snare` | Temps 2 et 4, roulements | Snare Drum, Modern 3 (timbre en place) |
| Caisse claire | `snare-rimshot` | Accents puissants | Snare Drum, Modern 3, rimshot |
| Caisse claire | `snare-sidestick` | Ballades, bossa | Snare Drum, Modern 3, cross-stick |
| Tom aigu | `tom-high` | Breaks, fills | Tom 1 à la baguette, réaccordé +3 demi-tons |
| Tom médium | `tom-mid` | Breaks, fills | Tom 2 à la baguette |
| Tom basse | `tom-floor` | Breaks, grooves lourds | Tom 2 à la baguette, réaccordé -4 demi-tons |
| Charleston | `hihat-closed` | Subdivisions (croches, doubles) | Hi-Hat, fermé |
| Charleston | `hihat-open` | Accents, levées | Hi-Hat, ouvert |
| Charleston | `hihat-pedal` | Garder le temps au pied | Hi-Hat, refermé au pied |
| Crash | `crash` | Ponctuer un début de phrase | Suspended Cymbal 1 à la baguette |
| Splash | `splash` | Accent court | Suspended Cymbal 1, réaccordée +5 demi-tons et raccourcie |
| Ride | `ride` | Alternative au charleston | Suspended Cymbal 2 à la baguette |
| Ride | `ride-bell` | Motifs latins, accents | Suspended Cymbal 1, frappe sur la cloche |
| Cloche | `cowbell` | Rythmes latins, funk | Cowbell 1 |

VCSL n'a ni vraie ride ni vrai splash : ce sont des cymbales suspendues d'orchestre jouées à la baguette, proches mais pas identiques.

## Percussions du monde (`world/`)

| Pièce | Identifiant | Son |
| --- | --- | --- |
| Bongo aigu | `bongo-high` | Frappe ouverte |
| Bongo grave | `bongo-low` | Frappe ouverte |
| Conga | `conga-open` | Frappe ouverte |
| Conga | `conga-muted` | Frappe étouffée |
| Tumba | `tumba` | Frappe ouverte |
| Darbouka | `darbuka-doum` | Doum (grave, au centre) |
| Darbouka | `darbuka-tek` | Tek (aigu, au bord) |
| Darbouka | `darbuka-ka` | Ka (aigu, autre main) |
| Cajón | `cajon-bass` | Frappe grave au centre |
| Cajón | `cajon-slap` | Claqué en haut |
| Tambour sur cadre | `frame-low` | Grand cadre |
| Tambour sur cadre | `frame-high` | Petit cadre |
| Mains | `clap` | Frappe de mains |

## Fichiers

- Chaque pièce existe en **3 vélocités** (`v1` douce, `v2` moyenne, `v3` forte) et en 1 ou 2 **variantes** par vélocité, pour éviter l'effet « mitraillette » : `kick-v3-2.ogg` = grosse caisse, frappe forte, variante 2.
- Formats : `.ogg` (Vorbis) et `.mp3` de secours, 44,1 kHz ; stéréo pour les enregistrements, mono pour la synthèse.
- Chaque son commence à l'impact (aucun silence au début). Pics : environ -12 dB (`v1`), -6 dB (`v2`) et -1 dB (`v3`) pour les kits enregistrés.
- `manifest.json` donne pour chaque pièce son nom affiché, un gain de mixage conseillé (`gain`), la vélocité maximale de chaque couche (`max`, entre 0 et 1) et ses fichiers (sans extension).

## Pour le moteur audio

- Choisir la couche dont `max` est la première supérieure ou égale à la vélocité, puis une variante au hasard, et moduler légèrement le gain avec la vélocité exacte.
- **Groupe d'étouffement du charleston** : `hihat-closed` et `hihat-pedal` doivent couper un `hihat-open` en cours, comme sur une vraie batterie.
- Les sons sont secs : la légère réverbération commune prévue dans [DESIGN.md](../../docs/DESIGN.md) s'ajoute dans le moteur.

## Régénérer les sons

Kits enregistrés (télécharge environ 2 Go d'échantillons VCSL) :

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/sgossner/VCSL.git /tmp/VCSL
git -C /tmp/VCSL sparse-checkout set "Membranophones/Struck Membranophones" "Idiophones/Struck Idiophones"
python3 tools/sound-import/import_vcsl.py --vcsl /tmp/VCSL
```

Kit synthétique :

```sh
python3 tools/sound-synth/generate.py
```

Dépendances : Python 3 avec numpy, et ffmpeg compilé avec libvorbis et libmp3lame. Le choix des échantillons pour chaque pièce est une simple liste en haut de `import_vcsl.py`.
