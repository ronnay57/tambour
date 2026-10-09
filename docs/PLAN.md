# Plan du projet

Quatre étapes. Chacune se termine par quelque chose de visible et utilisable. On ne passe à la suivante qu'après validation de la précédente.

## Étape 1 : Fondations

**Objectif** : un dépôt propre et un moyen de suivre l'avancement.

- Documentation : README, plan, architecture, conventions, design.
- Tableau de bord de suivi du projet (tâches par étape, statut).

**Terminé quand** : la documentation est sur `main` et le tableau de bord est en ligne.

## Étape 2 : Prototype jouable

**Objectif** : frapper un tambour dans le navigateur et entendre un son sans latence.

- Mise en place de Vite (JavaScript en modules, sans framework).
- Moteur audio basé sur la Web Audio API, avec préchargement des sons.
- Un premier kit de 4 à 6 pièces (grosse caisse, caisse claire, charleston, toms, cymbale).
- Contrôles souris, toucher (multi-doigts) et clavier.

**Terminé quand** : on peut jouer un rythme simple au clavier et au doigt sur mobile, sans décalage perceptible.

## Étape 3 : Belles musiques et interface travaillée

**Objectif** : que ce soit beau à voir et agréable à écouter.

- Sons de qualité (échantillons libres de droits), plusieurs vélocités par pièce.
- Boucles d'accompagnement (basse, nappes) avec réglage du tempo, et métronome.
- Plusieurs kits (batterie acoustique, percussions du monde, électronique).
- Interface finale selon [DESIGN.md](DESIGN.md) : animations de frappe, thèmes clair et sombre.
- Enregistrement et réécoute de ce qu'on joue.

**Terminé quand** : une session de jeu complète (choisir un kit, lancer une boucle, jouer, réécouter) fonctionne sur ordinateur et mobile.

## Étape 4 : Mise en ligne

**Objectif** : une adresse publique à partager.

- Déploiement automatique sur GitHub Pages à chaque fusion sur `main`.
- Vérification des performances (chargement des sons, latence) et de l'accessibilité.
- Page d'accueil et aide (raccourcis clavier).

**Terminé quand** : le site est accessible publiquement et se charge rapidement sur mobile.
