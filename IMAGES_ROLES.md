📚 GESTION DES IMAGES DES RÔLES
================================

Les 12 rôles du jeu Loup-Garou possèdent maintenant des images SVG personnalisées.

RÔLES ET IMAGES
===============

1. Voyante 🔮
   - Fichier: assets/images/roles/voyante.svg
   - Couleur: Violet/Or
   - Description: Voit les rôles des autres joueurs

2. Cupidon 💘
   - Fichier: assets/images/roles/cupidon.svg
   - Couleur: Rose/Blanc
   - Description: Lie deux joueurs à vie

3. Chasseur 🔫
   - Fichier: assets/images/roles/chasseur.svg
   - Couleur: Brun/Or
   - Description: Tire sur quelqu'un avant de mourir

4. Petite Fille 👧
   - Fichier: assets/images/roles/pettefille.svg
   - Couleur: Rose/Pêche
   - Description: Voit la nuit comme le jour

5. Loup-Garou 🐺
   - Fichier: assets/images/roles/loupgarou.svg
   - Couleur: Gris/Noir
   - Description: Principal antagoniste, tue le jour

6. Loup Blanc ⚪
   - Fichier: assets/images/roles/loupblanc.svg
   - Couleur: Blanc/Gris
   - Description: Loup solitaire

7. Sorcière 🧙‍♀️
   - Fichier: assets/images/roles/sorciere.svg
   - Couleur: Violet/Or
   - Description: Potions de vie et mort

8. Salvateur 🛡️
   - Fichier: assets/images/roles/salvateur.svg
   - Couleur: Vert/Or
   - Description: Protège la nuit

9. Idiot 🤡
   - Fichier: assets/images/roles/idiot.svg
   - Couleur: Orange/Jaune
   - Description: Survit au vote du jour

10. Tanneur Ancré ⚙️
    - Fichier: assets/images/roles/tancheancre.svg
    - Couleur: Teal/Gris
    - Description: Lié à un autre joueur

11. Gendarme 🚔
    - Fichier: assets/images/roles/gendarme.svg
    - Couleur: Marine/Or
    - Description: Bloque les actions la nuit

12. Renard 🦊
    - Fichier: assets/images/roles/renard.svg
    - Couleur: Orange/Rouge
    - Description: Détecte les loups

INTÉGRATION
===========

Les images sont intégrées dans:
- roles.js: Propriété 'image' pour chaque rôle
- index.html: Affichage des rôles du joueur
- app.js: Logique d'affichage des images
- css/main.css: Styles pour les images (.role-emoji img)

Les images sont des SVG de 200x200px et s'affichent automatiquement
si la propriété 'image' est définie, sinon c'est l'emoji qui s'affiche.

FORMAT DES SVG
==============

Chaque SVG contient:
- Gradient de couleur personnalisé
- Illustrations thématiques
- Texte du nom du rôle en bas
- ViewBox: "0 0 200 200"

AJOUTER UNE NOUVELLE IMAGE
===========================

1. Créer un fichier SVG dans assets/images/roles/
2. Format: role_name.svg (ex: voyante.svg)
3. Size: 200x200px avec viewBox="0 0 200 200"
4. Ajouter la propriété 'image' dans roles.js:
   
   image: 'assets/images/roles/votrerole.svg',

5. Commit et push les changements

NOTES
=====

- Les SVG sont optimisés pour mobile
- Les images se chargent localement (offline compatible)
- Les couleurs sont personnalisées pour chaque rôle
- Les images remplacent les emojis pour une meilleure présentation
