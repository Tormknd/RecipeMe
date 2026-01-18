# 🚀 Guide de Déploiement RecipeMe sur Hetzner

## Prérequis sur le serveur Hetzner

1. Docker et Docker Compose installés
2. Nginx configuré
3. L'API `recipeme-scraper` déjà en ligne et fonctionnelle
4. Accès SSH au serveur

## Étape 1 : Configuration Nginx

Sur votre serveur Hetzner, ajoutez la configuration RecipeMe à votre fichier Nginx principal (généralement `/etc/nginx/sites-available/chhaju.fr`) :

```bash
# Se connecter au serveur
ssh root@chhaju.fr

# Éditer la configuration Nginx
nano /etc/nginx/sites-available/chhaju.fr
```

Ajoutez le contenu du fichier `nginx-recipeme.conf` dans le bloc `server` existant, puis :

```bash
# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

## Étape 2 : Préparation du .env sur le serveur

Sur votre serveur, créez le fichier `.env` :

```bash
mkdir -p /opt/recipeme
cd /opt/recipeme
nano .env
```

Contenu du `.env` :

```env
DATABASE_URL="file:/app/data/prod.db"
GEMINI_API_KEY="votre_clé_gemini_ici"
RECIPE_SCRAPER_URL="http://recipeme-scraper:5000"
```

## Étape 3 : Vérification du réseau Docker

Assurez-vous que `recipeme-scraper` est accessible sur le même réseau Docker :

```bash
# Vérifier les réseaux Docker
docker network ls

# Si recipeme-scraper n'est pas sur le réseau recipeme-network, le connecter
docker network connect recipeme-network recipeme-scraper
```

Ou ajustez le `docker-compose.yml` pour utiliser le réseau existant de votre API scraper.

## Étape 4 : Déploiement

### Option A : Déploiement automatique (depuis Windows)

Depuis votre machine locale (Windows), utilisez Git Bash ou WSL :

```bash
# Rendre le script exécutable (si nécessaire)
chmod +x deploy.sh

# Lancer le déploiement
./deploy.sh
```

### Option B : Déploiement manuel

1. **Depuis votre machine locale** :

```powershell
# Créer l'archive (PowerShell)
tar -czf recipeme.tar.gz --exclude=node_modules --exclude=.next --exclude=*.db --exclude=.git --exclude=.env .

# Envoyer au serveur
scp recipeme.tar.gz root@chhaju.fr:/tmp/
```

2. **Sur le serveur** :

```bash
# Se connecter
ssh root@chhaju.fr

# Aller dans le dossier de déploiement
cd /opt/recipeme

# Extraire l'archive
tar -xzf /tmp/recipeme.tar.gz
rm /tmp/recipeme.tar.gz

# Construire l'image Docker
docker build -t recipeme-app:latest .

# Arrêter l'ancien conteneur (si existant)
docker-compose down

# Démarrer les nouveaux conteneurs
docker-compose up -d

# Attendre le démarrage
sleep 10

# Appliquer les migrations Prisma
docker exec recipeme-app npx prisma migrate deploy

# Vérifier le statut
docker ps | grep recipeme
docker logs recipeme-app
```

## Étape 5 : Vérification

1. Vérifier que les conteneurs tournent :
```bash
docker ps
```

2. Vérifier les logs :
```bash
docker logs recipeme-app -f
```

3. Tester l'accès :
```bash
curl http://localhost:3002
```

4. Accéder via le navigateur :
```
https://chhaju.fr/recipeMe
```

## Commandes utiles

### Voir les logs
```bash
docker logs recipeme-app -f
docker logs recipeme-scraper -f
```

### Redémarrer l'application
```bash
cd /opt/recipeme
docker-compose restart recipeme-app
```

### Mettre à jour l'application
Relancer simplement le script de déploiement ou refaire les étapes manuelles.

### Accéder au conteneur
```bash
docker exec -it recipeme-app sh
```

### Appliquer une nouvelle migration
```bash
docker exec recipeme-app npx prisma migrate deploy
```

### Sauvegarder la base de données
```bash
docker cp recipeme-app:/app/data/prod.db ./backup-$(date +%Y%m%d-%H%M%S).db
```

## Troubleshooting

### L'application ne démarre pas
```bash
# Vérifier les logs
docker logs recipeme-app

# Vérifier les variables d'environnement
docker exec recipeme-app env | grep -E "DATABASE|GEMINI|RECIPE"
```

### Erreur de connexion à recipeme-scraper
```bash
# Vérifier que les deux conteneurs sont sur le même réseau
docker network inspect recipeme-network

# Tester la connexion depuis recipeme-app
docker exec recipeme-app wget -O- http://recipeme-scraper:5000/health
```

### Nginx retourne 502 Bad Gateway
```bash
# Vérifier que le conteneur tourne
docker ps | grep recipeme-app

# Vérifier que le port 3002 est bien exposé
netstat -tlnp | grep 3002

# Vérifier les logs Nginx
tail -f /var/log/nginx/error.log
```

### Problèmes de basePath
Si les assets ne se chargent pas correctement, vérifiez que :
- `NODE_ENV=production` est bien défini dans le conteneur
- La configuration Nginx inclut bien les règles pour `/_next/static/`

## Architecture finale

```
Internet
    ↓
Nginx (chhaju.fr)
    ↓
/recipeMe → localhost:3002 (recipeme-app container)
    ↓
recipeme-scraper container (réseau Docker interne)
```

## Notes importantes

- Le conteneur `recipeme-app` expose le port 3002 sur l'hôte
- La base de données SQLite est stockée dans un volume Docker persistant
- Les migrations Prisma s'appliquent automatiquement au démarrage
- Le `basePath` est configuré uniquement en production
