# 🐺 Loup-Garou Mobile - Jeu en Présentiel avec Bluetooth

Un site web mobile-first pour jouer à Loup-Garou en temps réel avec synchronisation Bluetooth locale. Les joueurs se connectent sans internet, un Présentateur gère automatiquement les phases du jeu.

## 📋 Table des matières

- [Caractéristiques](#caractéristiques)
- [Architecture](#architecture)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Rôles](#rôles)
- [Phases du jeu](#phases-du-jeu)
- [API Bluetooth](#api-bluetooth)
- [Développement](#développement)

## ✨ Caractéristiques

### 🎮 Gameplay
- **Jeu complet Loup-Garou** avec 15+ rôles officiels
- **Synchronisation Bluetooth** locale entre tous les appareils
- **Gestion automatisée** des phases Jour/Nuit
- **Votes anonymes** et système d'élimination
- **Rôles dynamiques** répartis selon le nombre de joueurs

### 📱 Interface
- **Mobile-first** et fully responsive
- **PWA (Progressive Web App)** - fonctionne offline
- **Design minimaliste** et moderne
- **Trois interfaces** distinctes:
  - Présentateur: contrôle complet
  - Joueur: rôle, votes, actions
  - Lobby: connexion et configuration

### 🔌 Bluetooth
- **Web Bluetooth API** - connexion locale sans internet
- **Mode simulation** pour développement/test
- **Queue de messages** fiables
- **État synchronisé** en temps réel

### 📊 PWA
- Service Worker intégré
- Fonctionnement offline
- Installation sur écran d'accueil
- Cache automatique

## 🏗️ Architecture

```
Inposteur/
├── index.html              # Page unique SPA
├── manifest.json           # Configuration PWA
├── service-worker.js       # Offline + cache
├── css/
│   └── main.css           # Styles mobile-first
└── js/
    ├── app.js             # Orchestration UI
    ├── roles.js           # Définition des rôles
    ├── gameLogic.js       # Logique métier
    └── bluetooth.js       # Gestion Bluetooth
```

### Flux de données

```
UI (app.js)
    ↓
GameController (gameLogic.js) ← État du jeu
    ↓
SyncManager (bluetooth.js)
    ↓
BluetoothManager ↔ Appareils distants
    ↓
UI (mise à jour)
```

## 🚀 Installation

### Prérequis
- Serveur web (HTTPS ou localhost, requis pour Bluetooth)
- Navigateurs supports Web Bluetooth:
  - Chrome/Edge 56+
  - Opera 43+
  - Android: Chrome

### Déploiement local

1. **Cloner les fichiers** dans votre dossier web:
```bash
cp -r Inposteur/* /chemin/serveur/web/
```

2. **Serveur HTTPS (requis pour Bluetooth)**:
```bash
# Python 3
python -m http.server 8443 --cert cert.pem --key key.pem

# Node.js avec http-server
npm install -g http-server
http-server -S -c-1
```

3. **Générer certificat self-signed** (développement):
```bash
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
```

4. **Accéder à**:
```
https://localhost:8080
```

## 📖 Utilisation

### Pour le Présentateur

1. **Sur un appareil** (tablette ou ordinateur):
   - Entrer votre pseudo
   - Cliquer "Créer une Partie"
   - Sélectionner le nombre de joueurs
   - Activer/désactiver les rôles souhaités
   - Attendre les connexions des joueurs
   - Cliquer "Démarrer la Partie"

2. **Pendant le jeu**:
   - **Nuit**: Navigation automatique dans les actions de rôles
   - **Jour**: Gestion des votes et éliminations
   - Contrôler le rythme avec les boutons Précédent/Suivant

### Pour les Joueurs

1. **Sur un appareil mobile**:
   - Entrer votre pseudo
   - Cliquer "Rejoindre une Partie"
   - Attendre la connexion au Présentateur
   - Recevoir votre rôle (écran revient à nuit/jour/vote)

2. **Pendant la nuit**:
   - Si votre rôle a une action: sélectionner une cible
   - Sinon: attendre patiemment

3. **Pendant le jour**:
   - Discussion libre
   - Voter pour éliminer quelqu'un
   - Abstention possible

## 👥 Rôles

### Villageois (10 rôles)
- **Voyante** 🔮 - Découvre le rôle d'une personne
- **Salvateur** 🛡️ - Protège une personne des loups
- **Sorcière** 🧙‍♀️ - 2 potions: sauver/éliminer
- **Chasseur** 🔫 - Élimine quelqu'un après sa mort
- **Petite Fille** 👧 - Voit clair la nuit
- **Cupidon** 💘 - Lie 2 joueurs ensemble (1ère nuit)
- **Gendarme** 🚔 - Bloque une action la nuit
- **Renard** 🦊 - Détecte les loups alentour
- **Idiot** 🤡 - Survit au vote de jour
- **Tanneur Ancré** ⚙️ - Lié à un autre joueur

### Loups-Garous (2 rôles)
- **Loup-Garou** 🐺 - Élimine 1 personne par nuit
- **Loup Blanc** ⚪🐺 - Loup solitaire, élimine d'autres loups

### Notes
- ❌ **Villageois pur** intentionnellementxclu
- Rôles assignés automatiquement selon nombre de joueurs
- Rôles officiels de: https://loupgarou.fandom.com/

## 🔄 Phases du jeu

### Nuit
1. Présentateur voit tous les rôles en ordre d'action
2. Pour chaque rôle actif:
   - L'interface du joueur s'illumine
   - Affichage des instructions
   - Sélection de cible
3. Présentateur: Suivant → pour passer au joueur suivant
4. Fin nuit → Mort des éliminés → Passage au jour

### Jour
1. Discussion libre (30-60 secondes)
2. Présentateur: "Lancer le Vote"
3. Les joueurs vivants votent
4. Résultats calculés automatiquement
5. Présentateur valide l'élimination

### Conditions de victoire
- **Village gagne**: Tous les loups éliminés
- **Loups gagnent**: Parité ou majorité
- **Loup Blanc gagne**: Dernier survivant

## 🔌 API Bluetooth

### En mode réel (Web Bluetooth API)

**Créer une partie** (Présentateur):
```javascript
const bt = new BluetoothManager();
await bt.createGame('Mon Pseudo');
```

**Rejoindre une partie** (Joueur):
```javascript
const bt = new BluetoothManager();
await bt.joinGame('Mon Pseudo');
```

**Envoyer un message**:
```javascript
await bt.sendMessage({
    type: 'playerVote',
    voterId: 0,
    targetId: 3
});
```

### Interface des messages

Messages système:
- `gameCreated` - Partie créée
- `playerJoined` - Joueur connecté
- `gameStarted` - Jeu lancé
- `phaseChanged` - Phase changée
- `nightActionPrompt` - Action nocturne requise
- `votingPrompt` - Vote requis

Messages joueurs:
- `playerAction` - Action nocturne effectuée
- `playerVote` - Vote enregistré
- `playerEliminated` - Joueur éliminé
- `gameEnded` - Jeu terminé

## 🛠️ Développement

### Mode Simulation
Le jeu fonctionne sans Bluetooth réel pour développement:
- Activé automatiquement si Bluetooth non disponible
- Les messages sont simulés avec délais réalistes
- Tous les rôles et phases testables

### Structure du code

**roles.js** (1KB):
- Définition des 12 rôles
- Distribution automatique par nombre joueurs
- Validation des rôles sélectionnés

**gameLogic.js** (8KB):
- `GameState` - Estado del juego
- `GameController` - Orchestration logique
- Gestion nuit/jour/votes
- Conditions de victoire

**bluetooth.js** (6KB):
- `BluetoothManager` - Web Bluetooth API
- `SyncManager` - Synchronisation état/actions
- Mode simulation intégré

**app.js** (12KB):
- Gestion interface 3 écrans
- Event listeners
- Mise à jour UI en temps réel
- localStorage pour persistence

### Tester localement

1. Ouvrir 2 onglets sur `https://localhost`
   - Onglet 1: Présentateur (Créer)
   - Onglet 2: Joueur (Rejoindre)

2. Mode simulation:
   - Cliquer les boutons
   - Vérifier la console pour les messages
   - Les actions s'appliquent avec délais réalistes

3. Bluetooth réel (appareils physiques):
   - Présentateur sur tablette
   - Joueurs sur téléphones
   - Synchronisation en temps réel

### Déboguer

```javascript
// Dans console navigateur
AppState.gameController.getGameState()
AppState.bluetoothManager.isConnected
AppState.bluetoothManager.simulationMode

// Messages Bluetooth
AppState.bluetoothManager.onMessage(m => console.log(m))
```

### Améliorations possibles

- [ ] Authentification PIN pour les parties
- [ ] Historique des actions (qui a voté qui)
- [ ] Thèmes personnalisés
- [ ] Statistiques (nombre de victoires loups/village)
- [ ] Rôles avancés supplémentaires
- [ ] Chat in-game
- [ ] Support du mode espectateur pour éliminés
- [ ] Timer automatique pour phases
- [ ] Partage de lien pour invite
- [ ] Synchronisation avec backend (optionnel)

## 📱 Responsive Notes

### Écrans
- **Mobile** (320px+): Interface full-width
- **Tablet** (768px+): Layouts optimisés
- **Desktop** (1024px+): Contexte presentateur large

### Performance
- Cache CSS/JS via Service Worker
- Images optimisées (SVG pour icônes)
- Event debouncing
- État synchronisé localement

### Accessibilité
- Label pour tous les inputs
- Boutons tactiles (44px min)
- Contraste WCAG AA
- Texte lisible sur mobile

## 📄 Licence

Ce projet est fourni à titre d'exemple éducatif.

## 🤝 Support

- Consulter la console navigateur (F12) pour les logs
- Vérifier que HTTPS est activé
- Tester mode simulation d'abord
- Assurer que Bluetooth est activé (appareil)

---

**Bon jeu! 🎮🐺**
