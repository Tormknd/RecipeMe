#!/bin/sh
set -e

echo "🗄️  Initialisation de la base de données..."

# Créer le dossier data si nécessaire
mkdir -p /app/data

# Générer le client Prisma
echo "📦 Génération du client Prisma..."
npx prisma generate

# Appliquer les migrations
echo "🔄 Application des migrations..."
npx prisma migrate deploy

echo "✅ Base de données prête!"

# Démarrer l'application
echo "🚀 Démarrage de l'application..."
exec node server.js
