# Configuration Serveur Hetzner pour RecipeMe

## 1. Configuration Nginx

### Éditer la configuration du site

```bash
nano /etc/nginx/sites-available/chhaju.fr
```

### Ajouter la configuration RecipeMe dans le bloc `server`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name chhaju.fr;

    # ... autres configurations existantes ...

    # Configuration RecipeMe
    location /recipeMe {
        rewrite ^/recipeMe(.*)$ $1 break;
        
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Support des assets Next.js
    location ~* ^/recipeMe/_next/static/ {
        rewrite ^/recipeMe(.*)$ $1 break;
        proxy_pass http://localhost:3002;
        proxy_cache_valid 200 365d;
        proxy_cache_bypass $http_pragma $http_authorization;
        add_header Cache-Control "public, immutable";
    }

    # Support des fichiers publics
    location ~* ^/recipeMe/.*\.(ico|css|js|gif|jpe?g|png|svg|woff|woff2|ttf|eot)$ {
        rewrite ^/recipeMe(.*)$ $1 break;
        proxy_pass http://localhost:3002;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Tester et recharger Nginx

```bash
nginx -t
systemctl reload nginx
```

## 2. Configuration du fichier .env sur le serveur

```bash
mkdir -p /opt/recipeme
cd /opt/recipeme
nano .env
```

Contenu du `.env` :

```env
# Base de données
DATABASE_URL="file:/app/data/prod.db"

# Clé API Gemini (OBLIGATOIRE)
GEMINI_API_KEY="AIzaSy...votre_clé_ici"

# URL de l'API Scraper (adapter selon votre configuration)
RECIPE_SCRAPER_URL="http://recipeme-scraper:5000"
```

**Important** : Remplacez `AIzaSy...votre_clé_ici` par votre vraie clé API Gemini.

## 3. Configuration du réseau Docker

Si `recipeme-scraper` existe déjà, deux options :

### Option A : Utiliser le réseau existant (flavorsync-network)

RecipeMe utilise le réseau Docker `flavorsync-network` existant sur votre serveur.

```bash
# Vérifier que le réseau existe
docker network ls | grep flavorsync-network

# Vérifier que recipeme-scraper est sur ce réseau
docker network inspect flavorsync-network | grep recipeme-scraper

# Si recipeme-scraper n'est pas connecté, le connecter
docker network connect flavorsync-network recipeme-scraper
```

### Option B : Modifier docker-compose.yml (si configuration différente)

Si votre `recipeme-scraper` utilise un réseau différent ou un nom de conteneur différent, éditez `docker-compose.yml` :

```yaml
services:
  recipeme-app:
    # ...
    environment:
      - RECIPE_SCRAPER_URL=http://nom_du_conteneur_scraper:5000
    networks:
      - nom_du_reseau_existant

networks:
  nom_du_reseau_existant:
    external: true
```

## 4. Firewall (si nécessaire)

Si vous utilisez ufw ou iptables :

```bash
# Le port 3002 n'a pas besoin d'être ouvert publiquement
# Nginx fait le proxy, donc seuls les ports 80/443 doivent être ouverts
ufw status
```

## 5. Vérifications post-déploiement

### Vérifier les conteneurs

```bash
docker ps | grep recipeme
```

### Vérifier les logs

```bash
docker logs recipeme-app -f
```

### Tester l'accès local

```bash
curl http://localhost:3002
```

### Tester l'accès via Nginx

```bash
curl http://localhost/recipeMe
curl https://chhaju.fr/recipeMe
```

## 6. Maintenance

### Voir les logs en temps réel

```bash
docker logs -f recipeme-app
docker logs -f recipeme-scraper
```

### Redémarrer l'application

```bash
cd /opt/recipeme
docker-compose restart recipeme-app
```

### Sauvegarder la base de données

```bash
# Créer un dossier de backup
mkdir -p /opt/backups/recipeme

# Copier la base de données
docker cp recipeme-app:/app/data/prod.db /opt/backups/recipeme/backup-$(date +%Y%m%d-%H%M%S).db
```

### Restaurer une base de données

```bash
# Arrêter le conteneur
docker-compose stop recipeme-app

# Copier la base vers le conteneur
docker cp /opt/backups/recipeme/backup-XXXXXX.db recipeme-app:/app/data/prod.db

# Redémarrer
docker-compose start recipeme-app
```

## Troubleshooting

### Erreur 502 Bad Gateway

1. Vérifier que le conteneur tourne : `docker ps | grep recipeme-app`
2. Vérifier les logs : `docker logs recipeme-app`
3. Vérifier que le port 3002 est bien exposé : `netstat -tlnp | grep 3002`
4. Vérifier la config Nginx : `nginx -t`

### Les assets ne se chargent pas

1. Vérifier la variable `NODE_ENV=production` dans le conteneur
2. Vérifier les logs du navigateur (F12)
3. Vérifier la configuration Nginx pour `/_next/static/`

### Erreur de connexion à recipeme-scraper

1. Vérifier que les deux conteneurs sont sur le même réseau : `docker network inspect flavorsync-network`
2. Tester la connexion : `docker exec recipeme-app wget -O- http://recipeme-scraper:5000/health`

## Commandes utiles

```bash
# Voir tous les conteneurs
docker ps -a

# Voir les réseaux Docker
docker network ls

# Inspecter un réseau
docker network inspect flavorsync-network

# Voir les volumes
docker volume ls

# Entrer dans le conteneur
docker exec -it recipeme-app sh

# Arrêter et supprimer tout (ATTENTION)
cd /opt/recipeme
docker-compose down -v
```
