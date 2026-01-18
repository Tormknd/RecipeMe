# 🚀 RecipeMe - Déploiement sur Hetzner

## TL;DR (Pour déployer rapidement)

### 1️⃣ Sur le serveur (une seule fois)

```bash
# Envoyer le script
scp server-init.sh root@chhaju.fr:/tmp/

# Exécuter sur le serveur
ssh root@chhaju.fr
chmod +x /tmp/server-init.sh
/tmp/server-init.sh
```

### 2️⃣ Depuis votre PC Windows (PowerShell)

```powershell
# Vérifier (optionnel)
.\pre-deploy-check.ps1

# Déployer
.\deploy.ps1
```

### 3️⃣ C'est prêt ! 🎉

Accédez à : **https://chhaju.fr/recipeMe**

---

## 📚 Documentation complète

| Fichier | Description |
|---------|-------------|
| **[QUICKSTART.md](./QUICKSTART.md)** | 🚀 Démarrage rapide (5 min) |
| **[DEPLOY.md](./DEPLOY.md)** | 📖 Guide complet de déploiement |
| **[SERVER-CONFIG.md](./SERVER-CONFIG.md)** | ⚙️ Configuration serveur détaillée |
| **[DOCKER.md](./DOCKER.md)** | 🐳 Utilisation de Docker |
| **[DEPLOYMENT-FILES.md](./DEPLOYMENT-FILES.md)** | 📋 Liste de tous les fichiers |

---

## 🔧 Maintenance

```bash
# Sur le serveur
docker logs recipeme-app -f              # Voir les logs
cd /opt/recipeme && docker-compose restart  # Redémarrer
docker ps | grep recipeme                # Vérifier l'état
```

```powershell
# Depuis Windows
.\deploy.ps1                            # Mettre à jour
.\pre-deploy-check.ps1                  # Vérifier la config
```

---

## 🆘 Problème ?

1. Vérifier les logs : `docker logs recipeme-app -f`
2. Consulter [DEPLOY.md](./DEPLOY.md) section Troubleshooting
3. Vérifier Nginx : `nginx -t && systemctl status nginx`

---

## 📦 Fichiers de déploiement créés

### 🐳 Docker
- `Dockerfile` - Image Docker optimisée
- `docker-compose.yml` - Orchestration des services
- `.dockerignore` - Exclusions Docker
- `docker-entrypoint.sh` - Script de démarrage

### 🌐 Web
- `nginx-recipeme.conf` - Configuration Nginx

### 📜 Scripts
- `deploy.ps1` - Déploiement depuis Windows
- `deploy.sh` - Déploiement depuis Linux
- `pre-deploy-check.ps1` - Vérification pré-déploiement
- `test-docker-build.ps1` - Test local
- `server-init.sh` - Installation serveur

### 📚 Documentation
- `QUICKSTART.md` - Guide rapide
- `DEPLOY.md` - Guide complet
- `SERVER-CONFIG.md` - Config serveur
- `DOCKER.md` - Guide Docker
- `DEPLOYMENT-FILES.md` - Liste complète
- `README.md` - Mis à jour avec infos déploiement

### ⚙️ Configuration
- `next.config.ts` - Modifié avec basePath
- `.gitignore` - Mis à jour
- `.dockerignore` - Créé

---

## 🎯 Architecture finale

```
Internet
   ↓
Nginx (chhaju.fr)
   ↓
/recipeMe → recipeme-app:3002
              ↓
         recipeme-scraper:5000
```

**Base de données** : SQLite dans volume Docker persistant  
**Réseau** : `flavorsync-network` (Docker bridge, partagé avec recipeme-scraper)  
**Port exposé** : 3002 (localhost uniquement)

---

## ✅ Checklist de déploiement

- [ ] Clé Gemini obtenue
- [ ] SSH configuré vers le serveur
- [ ] Script `server-init.sh` exécuté sur le serveur
- [ ] Nginx configuré
- [ ] `.env` créé sur le serveur
- [ ] `recipeme-scraper` en cours d'exécution
- [ ] `deploy.ps1` exécuté avec succès
- [ ] Application accessible sur https://chhaju.fr/recipeMe
- [ ] Premier utilisateur créé

---

Made with ❤️ for cooking enthusiasts
