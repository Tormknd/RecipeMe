#!/bin/bash
# Script d'installation initial sur le serveur Hetzner
# À exécuter UNE SEULE FOIS sur le serveur

set -e

echo "🚀 Installation initiale de RecipeMe sur le serveur"
echo ""

# Variables
DEPLOY_PATH="/opt/recipeme"
NGINX_CONFIG_FILE="/etc/nginx/sites-available/recipeme"
NGINX_ENABLED="/etc/nginx/sites-enabled/recipeme"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Vérifier qu'on est root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Ce script doit être exécuté en tant que root${NC}"
    exit 1
fi

# Vérifier Docker
echo -e "${BLUE}🐳 Vérification de Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    echo "Installez Docker avec: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo -e "${GREEN}✅ Docker installé${NC}"

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose installé${NC}"

# Vérifier Nginx
echo -e "${BLUE}🌐 Vérification de Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}⚠️  Nginx n'est pas installé${NC}"
    read -p "Voulez-vous installer Nginx maintenant? (o/N) " -r
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        apt update && apt install -y nginx
    fi
fi
echo -e "${GREEN}✅ Nginx installé${NC}"

echo ""
echo -e "${BLUE}📁 Création du dossier de déploiement...${NC}"
mkdir -p ${DEPLOY_PATH}
cd ${DEPLOY_PATH}

echo ""
echo -e "${BLUE}🔐 Configuration des variables d'environnement...${NC}"
echo -e "${YELLOW}Veuillez entrer les informations suivantes:${NC}"
echo ""

# Demander la clé Gemini
read -p "Clé API Gemini (GEMINI_API_KEY): " GEMINI_KEY

# Demander l'URL du scraper
read -p "URL de l'API Scraper [http://recipeme-scraper:5000]: " SCRAPER_URL
SCRAPER_URL=${SCRAPER_URL:-http://recipeme-scraper:5000}

# Créer le fichier .env
cat > ${DEPLOY_PATH}/.env << EOF
# Production Environment Variables

# Base de données
DATABASE_URL="file:/app/data/prod.db"

# API Keys
GEMINI_API_KEY="${GEMINI_KEY}"

# Services
RECIPE_SCRAPER_URL="${SCRAPER_URL}"
EOF

echo -e "${GREEN}✅ Fichier .env créé${NC}"

echo ""
echo -e "${BLUE}🔗 Configuration du réseau Docker...${NC}"
# Utiliser le réseau existant flavorsync-network
if ! docker network ls | grep -q flavorsync-network; then
    echo -e "${RED}❌ Le réseau flavorsync-network n'existe pas${NC}"
    echo "Créez-le avec: docker network create flavorsync-network"
    exit 1
else
    echo -e "${GREEN}✅ Réseau flavorsync-network trouvé${NC}"
fi

# Vérifier si recipeme-scraper existe
if docker ps -a --format '{{.Names}}' | grep -q recipeme-scraper; then
    echo -e "${BLUE}🔌 Vérification de recipeme-scraper sur le réseau...${NC}"
    if docker network inspect flavorsync-network | grep -q recipeme-scraper; then
        echo -e "${GREEN}✅ recipeme-scraper déjà connecté au réseau${NC}"
    else
        docker network connect flavorsync-network recipeme-scraper 2>/dev/null || true
        echo -e "${GREEN}✅ recipeme-scraper connecté${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  recipeme-scraper n'est pas trouvé${NC}"
    echo "Assurez-vous qu'il est démarré avant de lancer recipeme-app"
fi

echo ""
echo -e "${BLUE}🌐 Configuration de Nginx...${NC}"
read -p "Domaine (ex: chhaju.fr): " DOMAIN

# Détecter le fichier de configuration existant
EXISTING_CONFIG=""
if [ -f "/etc/nginx/sites-available/${DOMAIN}" ]; then
    EXISTING_CONFIG="/etc/nginx/sites-available/${DOMAIN}"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    EXISTING_CONFIG="/etc/nginx/sites-available/default"
fi

if [ -n "$EXISTING_CONFIG" ]; then
    echo -e "${YELLOW}Un fichier de configuration Nginx existe déjà: ${EXISTING_CONFIG}${NC}"
    echo "Veuillez ajouter manuellement la configuration suivante dans le bloc 'server':"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    cat << 'NGINXCONF'
    # Configuration RecipeMe
    location /recipeMe {
        rewrite ^/recipeMe(.*)$ $1 break;
        
        proxy_pass http://localhost:3001;
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
        proxy_pass http://localhost:3001;
        proxy_cache_valid 200 365d;
        proxy_cache_bypass $http_pragma $http_authorization;
        add_header Cache-Control "public, immutable";
    }

    # Support des fichiers publics
    location ~* ^/recipeMe/.*\.(ico|css|js|gif|jpe?g|png|svg|woff|woff2|ttf|eot)$ {
        rewrite ^/recipeMe(.*)$ $1 break;
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
NGINXCONF
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    read -p "Appuyez sur Entrée une fois que vous avez ajouté la configuration..." -r
fi

# Tester et recharger Nginx
echo -e "${BLUE}🧪 Test de la configuration Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx rechargé${NC}"
else
    echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Installation initiale terminée!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Prochaines étapes:${NC}"
echo "1. Depuis votre machine locale, exécutez: ${YELLOW}.\deploy.ps1${NC}"
echo "2. L'application sera accessible sur: ${YELLOW}https://${DOMAIN}/recipeMe${NC}"
echo ""
echo -e "${BLUE}Commandes utiles:${NC}"
echo "  docker logs recipeme-app -f    # Voir les logs"
echo "  cd ${DEPLOY_PATH}              # Aller dans le dossier de déploiement"
echo "  docker-compose restart         # Redémarrer l'application"
echo ""
