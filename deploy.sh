#!/bin/bash

# Script de déploiement RecipeMe sur Hetzner
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement de RecipeMe..."

# Variables (à surcharger via env vars ou modifier localement sans commit)
SERVER_USER="${DEPLOY_USER:-root}"
SERVER_HOST="${DEPLOY_HOST:-your-server-ip}"
APP_NAME="recipeme-app"
DEPLOY_PATH="/opt/recipeme"

# Vérification des variables requises
if [ "$SERVER_HOST" = "your-server-ip" ]; then
    echo -e "${RED}❌ Erreur: SERVER_HOST n'est pas configuré.${NC}"
    echo "Usage: DEPLOY_HOST=x.x.x.x ./deploy.sh"
    exit 1
fi

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📦 Création de l'archive du projet...${NC}"
tar -czf recipeme.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.db' \
  --exclude='*.db-journal' \
  --exclude='.git' \
  --exclude='.env' \
  .

echo -e "${BLUE}📤 Envoi vers le serveur...${NC}"
scp recipeme.tar.gz ${SERVER_USER}@${SERVER_HOST}:/tmp/

echo -e "${BLUE}🔧 Déploiement sur le serveur...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e

DEPLOY_PATH="/opt/recipeme"
APP_NAME="recipeme-app"

# Créer le dossier de déploiement
mkdir -p ${DEPLOY_PATH}
cd ${DEPLOY_PATH}

# Extraire l'archive
echo "📦 Extraction de l'archive..."
tar -xzf /tmp/recipeme.tar.gz -C ${DEPLOY_PATH}
rm /tmp/recipeme.tar.gz

# Construire l'image Docker
echo "🐳 Construction de l'image Docker..."
docker build -t recipeme-app:latest .

# Arrêter l'ancien conteneur si existant
echo "🛑 Arrêt de l'ancien conteneur..."
docker-compose down || true

# Démarrer les nouveaux conteneurs
echo "▶️  Démarrage des conteneurs..."
docker-compose up -d

# Attendre que le conteneur soit prêt
echo "⏳ Attente du démarrage..."
sleep 10

# Appliquer les migrations Prisma
echo "🗄️  Application des migrations..."
docker exec ${APP_NAME} npx prisma migrate deploy

# Vérifier le statut
echo "✅ Vérification du statut..."
docker ps | grep ${APP_NAME}

echo "✅ Déploiement terminé!"
ENDSSH

# Nettoyer l'archive locale
rm recipeme.tar.gz

echo -e "${GREEN}✅ Déploiement réussi!${NC}"
echo -e "${GREEN}🌐 Application accessible via: https://chhaju.fr/recipeMe${NC}"
