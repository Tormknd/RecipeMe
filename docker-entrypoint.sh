#!/bin/sh
set -e

echo "🗄️  Initialisation de la base de données..."

# Créer le dossier data si nécessaire
mkdir -p /app/data

# Chemin vers l'exécutable Prisma local
PRISMA_BIN="./node_modules/.bin/prisma"

# Générer le client Prisma (généralement déjà fait au build, mais au cas où)
echo "📦 Génération du client Prisma..."
if [ -f "$PRISMA_BIN" ]; then
    $PRISMA_BIN generate
else
    echo "⚠️  Binaire Prisma non trouvé à $PRISMA_BIN, essai avec npx..."
    npx prisma generate
fi

# Appliquer les migrations
echo "🔄 Application des migrations..."
if [ -f "$PRISMA_BIN" ]; then
    $PRISMA_BIN migrate deploy
else
    echo "⚠️  Binaire Prisma non trouvé, essai avec npx..."
    npx prisma migrate deploy
fi

echo "✅ Base de données prête!"

# Démarrer l'application
echo "🚀 Démarrage de l'application..."
exec node server.js
