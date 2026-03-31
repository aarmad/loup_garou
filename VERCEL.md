# Configuration Vercel - Guide de Mise à Jour

## ✅ Changements Effectués

### 1. **API REST au lieu de WebSocket**
- WebSocket remplacé par HTTP polling (synchronisation toutes les 2 secondes)
- Vercel Functions pour gérer les parties (`/api/games.js`)
- Compatibilité complète avec Vercel (pas de serveurs longue durée)

### 2. **Fichiers Créés**
- **`api/games.js`** - Vercel Function pour gérer les parties
- **`vercel.json`** - Configuration du déploiement Vercel
- **`.vercelignore`** - Fichiers à ignorer lors du déploiement

### 3. **Fichiers Modifiés**
- **`js/network.js`** - Migration WebSocket → HTTP polling
- **`package.json`** - Ajout du script `build`

---

## 🚀 Redéployer sur Vercel

### Option 1: Redéploiement Automatique
Le dépôt GitHub est à jour. Vercel devrait redéployer automatiquement.

### Option 2: Redéploiement Manuel
1. Accéder à: https://vercel.com/dashboard
2. Sélectionner le projet "loup-garou"
3. Cliquer sur "Redeploy" (ou "Reeploy")

### Option 3: Vérifier le Statut
Accéder à: https://loup-garou-seven.vercel.app/

---

## 🔍 Vérification du Fonctionnement

1. **Test en local:**
   ```bash
   npm run dev
   # Accès: https://localhost:8000
   ```

2. **Test sur Vercel:**
   - Accès: https://loup-garou-seven.vercel.app/
   - Créer une partie: code 4 chiffres généré
   - Un autre onglet rejoint avec le même code
   - Synchronisation automatique

---

## 📋 Architecture Vercel

```
Vercel (Frontend + API)
├─ index.html (statique)
├─ css/ (statique)
├─ js/ (statique)
├─ service-worker.js (PWA)
├─ manifest.json (PWA)
└─ /api/games.js (Vercel Function)
    ├─ POST /api/games → Créer partie
    ├─ GET /api/games?code=XXXX → Récupérer état
    └─ PUT /api/games?code=XXXX → Mettre à jour état
```

---

## 💡 Points Importants

✓ **Synchronisation** - HTTP polling toutes les 2s (économe)
✓ **localStorage** - État local en backup
✓ **Scalable** - Fonctionne même sans serveur persistant
✓ **PWA** - Fonctionne offline (avec localStorage)

---

## ⚠️ Limitations Vercel

❌ WebSocket longue durée (non supporté sur le plan gratuit)
✅ HTTP polling (supporté)
✅ Vercel Functions (gratuit pour les API)

---

## 📝 Logs Vercel

Vous pouvez voir les logs:
- https://vercel.com/dashboard → Deployments → logs
- Chercher les erreurs dans la console du navigateur

---

**Dernière mise à jour:** 31 mars 2026
