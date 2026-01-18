# 🐳 Guide Docker pour RecipeMe

Guide rapide pour utiliser RecipeMe avec Docker.

## Quick Start

### 1. Build de l'image

```bash
docker build -t recipeme-app:latest .
```

### 2. Créer un fichier .env

```bash
cat > .env << EOF
DATABASE_URL="file:/app/data/prod.db"
GEMINI_API_KEY="votre_clé_gemini"
RECIPE_SCRAPER_URL="http://recipeme-scraper:5000"
EOF
```

### 3. Lancer avec Docker Compose

```bash
docker-compose up -d
```

### 4. Vérifier

```bash
docker logs recipeme-app -f
curl http://localhost:3002
```

## Commandes utiles

### Logs

```bash
# Voir les logs en temps réel
docker logs -f recipeme-app

# Voir les 100 dernières lignes
docker logs --tail 100 recipeme-app
```

### Redémarrer

```bash
docker-compose restart recipeme-app
```

### Arrêter

```bash
docker-compose down
```

### Arrêter et supprimer les volumes (ATTENTION : perte de données)

```bash
docker-compose down -v
```

### Entrer dans le conteneur

```bash
docker exec -it recipeme-app sh
```

### Appliquer les migrations manuellement

```bash
docker exec recipeme-app npx prisma migrate deploy
```

### Sauvegarder la base de données

```bash
docker cp recipeme-app:/app/data/prod.db ./backup-$(date +%Y%m%d-%H%M%S).db
```

### Restaurer une base de données

```bash
docker cp ./backup-XXXXXX.db recipeme-app:/app/data/prod.db
docker-compose restart recipeme-app
```

## Variables d'environnement

| Variable | Description | Obligatoire | Défaut |
|----------|-------------|-------------|--------|
| `DATABASE_URL` | Chemin de la base SQLite | Oui | `file:/app/data/prod.db` |
| `GEMINI_API_KEY` | Clé API Google Gemini | Oui | - |
| `RECIPE_SCRAPER_URL` | URL de l'API scraper | Non | - |
| `NODE_ENV` | Environnement Node.js | Non | `production` |

## Ports

- **3000** : Port interne du conteneur
- **3002** : Port exposé sur l'hôte (configurable dans `docker-compose.yml`)

## Volumes

- **recipeme-data** : Volume Docker pour la persistance de la base de données SQLite
  - Monté sur `/app/data` dans le conteneur

## Réseau

- **flavorsync-network** : Réseau Docker existant utilisé pour la communication entre les services
  - Partagé avec `recipeme-scraper`
  - Permet à `recipeme-app` de communiquer avec `recipeme-scraper`
  - Réseau externe (créé en dehors de docker-compose)

## Architecture Docker

```
┌─────────────────────────────────────────┐
│  flavorsync-network (Docker Network)    │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  recipeme-app                      │ │
│  │  - Port: 3002:3000                 │ │
│  │  - Volume: recipeme-data:/app/data │ │
│  │  - Healthcheck actif               │ │
│  └────────────────────────────────────┘ │
│            ↓                             │
│  ┌────────────────────────────────────┐ │
│  │  recipeme-scraper                  │ │
│  │  - Port: 5000                      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Healthcheck

Le conteneur inclut un healthcheck automatique :

- **Test** : `wget --no-verbose --tries=1 --spider http://localhost:3000`
- **Intervalle** : 30 secondes
- **Timeout** : 10 secondes
- **Retries** : 3
- **Start period** : 40 secondes

Voir le statut :

```bash
docker ps
# La colonne STATUS affiche "healthy" ou "unhealthy"
```

## Troubleshooting

### Le conteneur ne démarre pas

```bash
# Voir les logs
docker logs recipeme-app

# Vérifier les variables d'environnement
docker exec recipeme-app env | grep -E "DATABASE|GEMINI|RECIPE"

# Vérifier l'entrypoint
docker exec recipeme-app cat /app/docker-entrypoint.sh
```

### Erreur de connexion à recipeme-scraper

```bash
# Vérifier que les deux conteneurs sont sur le même réseau
docker network inspect flavorsync-network

# Tester la connexion
docker exec recipeme-app wget -O- http://recipeme-scraper:5000/health
```

### Base de données corrompue

```bash
# Sauvegarder l'ancienne base
docker cp recipeme-app:/app/data/prod.db ./backup-corrupted.db

# Arrêter le conteneur
docker-compose stop recipeme-app

# Supprimer la base
docker exec recipeme-app rm /app/data/prod.db

# Redémarrer (les migrations recréeront la base)
docker-compose start recipeme-app
```

### Problème de permissions

```bash
# Vérifier les permissions dans le conteneur
docker exec recipeme-app ls -la /app/data

# L'utilisateur nextjs (uid 1001) doit avoir accès au dossier data
```

## Build multi-plateforme

Pour construire une image compatible avec différentes architectures :

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t recipeme-app:latest .
```

## Optimisation de l'image

L'image utilise une architecture multi-stage pour optimiser la taille :

1. **base** : Image Alpine Node.js 20
2. **deps** : Installation des dépendances
3. **builder** : Build de l'application Next.js
4. **runner** : Image finale minimale

Taille approximative de l'image finale : ~400-500 MB

## Sécurité

- L'application tourne avec un utilisateur non-root (`nextjs`, uid 1001)
- Les fichiers sensibles (`.env`, base de données de dev) sont exclus via `.dockerignore`
- Les secrets doivent être passés via des variables d'environnement, jamais hardcodés

## Pour aller plus loin

- **Guide de déploiement complet** : [`DEPLOY.md`](./DEPLOY.md)
- **Configuration serveur** : [`SERVER-CONFIG.md`](./SERVER-CONFIG.md)
- **Démarrage rapide** : [`QUICKSTART.md`](./QUICKSTART.md)
