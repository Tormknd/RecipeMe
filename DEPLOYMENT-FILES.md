# 📦 Fichiers de Déploiement RecipeMe

Ce document liste tous les fichiers créés pour le déploiement de RecipeMe sur votre serveur Hetzner.

## 🐳 Configuration Docker

### `Dockerfile`
Image Docker multi-stage optimisée pour la production :
- Stage 1 : Installation des dépendances
- Stage 2 : Build de l'application Next.js
- Stage 3 : Image de production minimale
- Inclut le support Prisma et les migrations automatiques
- Healthcheck intégré avec wget

### `docker-compose.yml`
Orchestration des conteneurs :
- Service `recipeme-app` (port 3002)
- Connexion au service `recipeme-scraper` existant
- Volume persistant pour la base de données SQLite
- Réseau Docker partagé
- Healthcheck automatique

### `.dockerignore`
Fichiers exclus de l'image Docker pour optimiser la taille et la sécurité

### `docker-entrypoint.sh`
Script d'initialisation du conteneur :
- Génération du client Prisma
- Application automatique des migrations
- Démarrage de l'application

## 🌐 Configuration Nginx

### `nginx-recipeme.conf`
Configuration Nginx pour le proxy reverse :
- Route principale `/recipeMe`
- Support des assets Next.js (`/_next/static/`)
- Support des fichiers publics
- Headers de proxy configurés
- Cache optimisé pour les assets statiques

## 📜 Scripts de Déploiement

### `deploy.ps1` (Windows PowerShell)
Script de déploiement automatisé depuis Windows :
- Création de l'archive tar.gz
- Envoi via SCP sur le serveur
- Construction de l'image Docker
- Démarrage des conteneurs
- Vérification du statut

### `deploy.sh` (Linux/Bash)
Script de déploiement pour Linux/macOS/WSL/Git Bash

### `pre-deploy-check.ps1`
Script de vérification pré-déploiement :
- Vérifie les fichiers requis localement
- Teste la connexion SSH
- Vérifie Docker sur le serveur
- Vérifie que `recipeme-scraper` tourne
- Vérifie Nginx

### `test-docker-build.ps1`
Script pour tester le build Docker en local avant déploiement

## 📚 Documentation

### `QUICKSTART.md`
Guide de déploiement rapide en 5 minutes

### `DEPLOY.md`
Guide de déploiement complet avec :
- Étapes détaillées
- Options de déploiement manuel et automatique
- Commandes utiles
- Troubleshooting

### `SERVER-CONFIG.md`
Configuration détaillée du serveur :
- Configuration Nginx complète
- Configuration du fichier `.env`
- Configuration du réseau Docker
- Commandes de maintenance
- Troubleshooting approfondi

## ⚙️ Configuration Next.js

### `next.config.ts` (modifié)
Configuration du basePath pour la production :
```typescript
basePath: process.env.NODE_ENV === 'production' ? '/recipeMe' : ''
assetPrefix: process.env.NODE_ENV === 'production' ? '/recipeMe' : ''
```

## 📋 Utilisation

### Première fois (Configuration serveur)

1. Suivre [`SERVER-CONFIG.md`](./SERVER-CONFIG.md)
2. Configurer Nginx
3. Créer le fichier `.env` sur le serveur
4. Vérifier le réseau Docker

### Déploiement

```powershell
# Vérification (optionnel)
.\pre-deploy-check.ps1

# Déploiement
.\deploy.ps1
```

### Mise à jour

Simplement relancer `.\deploy.ps1` après avoir modifié le code.

## 🔍 Vérification

Après déploiement, l'application sera accessible à :
```
https://chhaju.fr/recipeMe
```

## 📁 Structure complète

```
RecipeMe/
├── 🐳 Docker
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .dockerignore
│   └── docker-entrypoint.sh
│
├── 🌐 Nginx
│   └── nginx-recipeme.conf
│
├── 📜 Scripts
│   ├── deploy.ps1 (Windows)
│   ├── deploy.sh (Linux)
│   ├── pre-deploy-check.ps1
│   └── test-docker-build.ps1
│
├── 📚 Documentation
│   ├── QUICKSTART.md (Démarrage rapide)
│   ├── DEPLOY.md (Guide complet)
│   ├── SERVER-CONFIG.md (Config serveur)
│   └── DEPLOYMENT-FILES.md (Ce fichier)
│
└── ⚙️ Configuration
    └── next.config.ts (modifié)
```

## ✅ Checklist de déploiement

- [ ] Nginx configuré sur le serveur
- [ ] Fichier `.env` créé dans `/opt/recipeme/`
- [ ] `recipeme-scraper` accessible
- [ ] Tests de connectivité passés (`pre-deploy-check.ps1`)
- [ ] Déploiement effectué (`deploy.ps1`)
- [ ] Application accessible via `https://chhaju.fr/recipeMe`
- [ ] Logs vérifiés (`docker logs recipeme-app`)

## 🆘 Support

En cas de problème, consulter dans l'ordre :

1. **QUICKSTART.md** - Pour les questions basiques
2. **DEPLOY.md** - Pour le troubleshooting général
3. **SERVER-CONFIG.md** - Pour les problèmes de configuration serveur
4. Logs Docker : `docker logs recipeme-app -f`
5. Logs Nginx : `tail -f /var/log/nginx/error.log`
