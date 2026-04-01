# Configuration Vercel pour MongoDB

## ⚠️ Action Requise sur Vercel Dashboard

Après le push vers GitHub, il faut ajouter la variable d'environnement à Vercel pour que le jeu fonctionne en production.

### Étapes:

1. **Accédez au dashboard Vercel:**
   - https://vercel.com/dashboard

2. **Sélectionnez le projet `loup-garou`**

3. **Allez dans Settings → Environment Variables**

4. **Ajoutez une nouvelle variable:**
   - **Nom:** `MONGODB_URI`
   - **Valeur:** `mongodb+srv://aaronquamone_db_user:z5QlOID71ifknk7u@aarmad.7sladpr.mongodb.net/loup-garou?retryWrites=true&w=majority&appName=aarmad`

5. **Appliquez à tous les environnements** (Production, Preview, Development)

6. **Cliquez sur "Save"**

7. **Redéployez le projet:**
   - Allez dans "Deployments"
   - Cliquez sur le dernier déploiement
   - Cliquez sur "Redeploy"

---

## 🧪 Test Après Configuration

1. **Attendre ~5 minutes** que Vercel redéploie
2. **Ouvrir l'app:** https://loup-garou-seven.vercel.app/
3. **Tester avec 2 appareils DIFFÉRENTS:**
   - Présentateur: crée une partie (sur PC)
   - Joueur: rejoins avec le code (sur Téléphone)
   - Vérifier que le compteur de joueurs se met à jour en < 1s

---

## 🔧 Configuration Locale

Pour développement (déjà fait):
- Fichier `.env.local` contient la MONGODB_URI
- Serveur démarre sur `https://localhost:8000`
- API disponible sur: `https://localhost:8000/api/games`

---

## 📝 Structure API Vercel

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/games` | POST | Crée une nouvelle partie, retourne `{code: '1234'}` |
| `/api/games/:code` | GET | Récupère l'état d'une partie |
| `/api/games/:code` | PUT | Met à jour l'état d'une partie |

---

## ✅ Vérification

Après configuration:
```
✓ Présentateur crée partie → code obtenu
✓ Joueur externe rejoint avec code
✓ Joueurs liste se synchronise < 1s
✓ Numéro de salle permanent visible
✓ Timer phase fonctionne
```

---

**Une fois Make les étapes ci-dessus, le jeu fonctionnera parfaitement en production!** 🚀
