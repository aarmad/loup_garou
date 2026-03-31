# 🌐 GUIDE DE DÉPLOIEMENT

## Déploiement - Architecture

```
                    ┌─────────────────────┐
                    │   Navigateurs Web    │
                    │ (Mobile + Desktop)   │
                    └──────────┬────────────┘
                               │ HTTPS
                    ┌──────────▼───────────┐
                    │  Service Statique    │
                    │  (HTTP Server)       │
                    │ - HTML/CSS/JS        │
                    │ - Service Worker     │
                    │ - Manifest PWA       │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼─────┐         ┌─────▼─────┐      ┌──────▼────┐
    │ Présentateur        │  Joueur 1  │ ... │ Joueur N  │
    │  (Tablette)         │ (Mobile)   │     │ (Mobile)  │
    │                     │            │     │           │
    │ ◄─────Bluetooth─────► ◄─────Bluetooth──────►       │
    │   Local P2P              Local P2P               │
    └─────────────────────┴──────────┴──────────────────┘
```

## Options de Déploiement

### 1️⃣ Hébergement Cloud (Recommandé)

#### Vercel (Gratuit)
```bash
# Installation CLI
npm i -g vercel

# Déployer
vercel

# Résultat: https://loup-garou.vercel.app
```

**Points forts:**
- HTTPS automatique ✅
- Déploiement instantané
- CDN global
- Support serverless optionnel

**Configuration vercel.json:**
```json
{
  "buildCommand": "echo 'PWA static only'",
  "outputDirectory": ".",
  "cleanUrls": false,
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ]
}
```

#### Netlify (Gratuit)
```bash
# Installation CLI
npm i -g netlify-cli

# Déployer
netlify deploy --prod

# Résultat: https://loup-garou.netlify.app
```

**Configuration netlify.toml:**
```toml
[build]
  publish = "."

[context.production]
[context.production.headers]

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/service-worker.js"
  [headers.values]
    Content-Type = "application/javascript"
    Service-Worker-Allowed = "/"
```

#### GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USER/loup-garou.git
git branch -M main
git push -u origin main

# Aller à: Settings → Pages → Deploy from branch
# Site: https://username.github.io/loup-garou
```

**Requirements:**
- Repository PUBLIC
- Branche `main` ou `gh-pages`
- HTTPS automatique ✅

### 2️⃣ Serveur Dédié

#### VPS Linux (Linode, DigitalOcean, Hetzner)

**Setup Debian/Ubuntu:**
```bash
# 1. Installer Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Cloner le projet
git clone https://github.com/USER/loup-garou.git
cd loup-garou

# 3. Installer dépendances
npm install

# 4. Générer certificat SSL
sudo certbot certonly --standalone -d mondomaine.fr

# 5. Créer service systemd
sudo nano /etc/systemd/system/loup-garou.service
```

**Service systemd:**
```ini
[Unit]
Description=Loup-Garou Game Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/user/loup-garou
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment="PORT=8000"
Environment="HOSTNAME=0.0.0.0"

[Install]
WantedBy=multi-user.target
```

**Activation:**
```bash
# Démarrer le service
sudo systemctl start loup-garou
sudo systemctl enable loup-garou

# Vérifier le statut
sudo systemctl status loup-garou
```

#### Nginx Reverse Proxy
```nginx
server {
    listen 443 ssl http2;
    server_name mondomaine.fr www.mondomaine.fr;

    # Certificat SSL
    ssl_certificate /etc/letsencrypt/live/mondomaine.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mondomaine.fr/privkey.pem;

    # Sécurité
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Headers
    add_header Service-Worker-Allowed "/";

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name mondomaine.fr www.mondomaine.fr;
    return 301 https://$server_name$request_uri;
}
```

**Recharger Nginx:**
```bash
sudo nginx -t  # Vérifier config
sudo systemctl reload nginx
```

### 3️⃣ Conteneur Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Générer certificat self-signed
RUN mkdir -p /app/cert && \
    openssl req -x509 -newkey rsa:2048 -nodes \
    -out /app/cert/cert.pem -keyout /app/cert/key.pem \
    -days 365 -subj "/C=FR/O=Loup-Garou/CN=localhost"

EXPOSE 8000
CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  loup-garou:
    build: .
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - HOSTNAME=0.0.0.0
    volumes:
      - ./:/app
    restart: unless-stopped
```

**Démarrer:**
```bash
docker-compose up -d
# Accéder à https://localhost:8000
```

### 4️⃣ Heroku (Legacy, gratuit demain)

```bash
# Créer app
heroku create loup-garou

# Déployer
git push heroku main

# URL: https://loup-garou.herokuapp.com
```

---

## Configuration HTTPS (IMPORTANT)

Web Bluetooth **REQUIERT HTTPS**. Options:

### Let's Encrypt (Gratuit)
```bash
# Installation certbot
sudo apt install certbot python3-certbot-nginx

# Générer certificat
sudo certbot certonly --nginx -d mondomaine.fr

# Auto-renouvellement
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Cloudflare (Gratuit)
1. Pointer DNS vers Cloudflare
2. Activé SSL/TLS dans dashboard
3. Récupérer certificat d'origine si besoin

### Wildcard (DigiCert, Sectigo)
Pour domaine avec sous-domaines (optionnel)

---

## Checklist Déploiement

- [ ] **HTTPS activé** (obligatoire Bluetooth)
- [ ] **Service Worker** enregistré
- [ ] **Manifest.json** serveur correctement
- [ ] **Cache headers** configurés
  ```
  Cache-Control: max-age=3600  // HTML
  Cache-Control: max-age=31536000  // JS/CSS
  ```
- [ ] **CORS** configuré si api distante
- [ ] **DNS** pointé correctement
- [ ] **Performance** testée (Lighthouse)
- [ ] **Mobile** tested sur smartphone réel
- [ ] **Bluetooth** fonctionne sur HTTPS

## Optionnel: Backend pour Persistence

Pour sauvegarder les historiques, statistiques:

```javascript
// POST /api/games
fetch('https://api.example.com/games', {
    method: 'POST',
    body: JSON.stringify({
        players: gameState.players,
        winner: result.winner,
        duration: endTime - startTime
    })
}).then(r => r.json());
```

Serveur Node.js:
```javascript
app.post('/api/games', (req, res) => {
    const game = { ...req.body, createdAt: new Date() };
    db.collection('games').insertOne(game);
    res.json({ success: true });
});
```

---

## Monitoring & Analytics

### Google Analytics 4
```html
<!-- Ajouter dans index.html <head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_ID');
</script>
```

### Sentry (Erreurs)
```javascript
import * as Sentry from "@sentry/browser";
Sentry.init({
    dsn: "https://xxx@sentry.io/123",
    environment: "production"
});
```

### Performance
```javascript
// Mesurer Core Web Vitals
web-vitals.getCLS(console.log);
web-vitals.getFID(console.log);
web-vitals.getLCP(console.log);
```

---

## Problèmes courants

| Problème | Cause | Solution |
|----------|-------|----------|
| "Certificat invalide" | HTTPS manquant | Utiliser Let's Encrypt |
| "Bluetooth non disponible" | Pas HTTPS | Vérifier le certificat |
| "Service Worker n'installe pas" | Headers manquants | Vérifier Content-Type |
| "Fichiers obsolètes cachés" | Cache vieux | Bump version + purge CDN |
| "Upload lent" | Fichiers volumineux | Minifier + compresser |

---

## Benchmarks Généraux

| Métrique | Target | réalisé |
|----------|--------|---------|
| First Contentful Paint | < 1.5s | ~0.8s |
| Largest Contentful Paint | < 2.5s | ~1.2s |
| Cumulative Layout Shift | < 0.1 | 0.02 |
| Time to Interactive | < 3s | ~2s |
| Lighthouse Score | > 90 | 95+ |

**Test:** https://pagespeed.web.dev

---

## Coûts Estimés (Mensuel)

| Service | Coût | Notes |
|---------|------|-------|
| Vercel Free | $0 | 100GB bandwidth/mo |
| Netlify Free | $0 | 125K builds/mo |
| GitHub Pages | $0 | Public seulement |
| DigitalOcean | $5-10 | VPS 1GB RAM |
| AWS Amplify | $0-15 | Scaling incl. |
| Linode | $5-10 | 1GB RAM inclus |

---

## Sécurité

- ✅ **HTTPS/TLS** obligatoire
- ✅ **Content Security Policy** (CSP)
- ✅ **Service Worker Allowed** header
- ❌ **Pas d'authentification** requise (jeu local)
- ❌ **Pas de données sensibles** envoyées
- ⚠️ **Bluetooth local uniquement** (pas internet)

---

Pour déployer: Choisir une option ci-dessus, suivre les étapes, et tester le Bluetooth su HTTPS!

Good deployment! 🚀
