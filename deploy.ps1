# Script de déploiement RecipeMe pour Windows (PowerShell)
# Usage: .\deploy.ps1

param(
    [string]$ServerHost = $env:DEPLOY_HOST,
    [string]$ServerUser = $(if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { "root" }),
    [string]$DeployPath = "/opt/recipeme"
)

if ([string]::IsNullOrEmpty($ServerHost) -or $ServerHost -eq "your-server-ip") {
    Write-Host "❌ Erreur: Le paramètre -ServerHost ou la variable d'environnement DEPLOY_HOST est requis." -ForegroundColor Red
    Write-Host "Usage: .\deploy.ps1 -ServerHost 'x.x.x.x'" -ForegroundColor Gray
    exit 1
}

$ErrorActionPreference = "Stop"

Write-Host "🚀 Déploiement de RecipeMe..." -ForegroundColor Blue

# Créer l'archive
Write-Host "📦 Création de l'archive du projet..." -ForegroundColor Cyan
$archiveName = "recipeme.tar.gz"

# Utiliser tar de Windows (disponible depuis Windows 10)
tar -czf $archiveName `
    --exclude='node_modules' `
    --exclude='.next' `
    --exclude='*.db' `
    --exclude='*.db-journal' `
    --exclude='.git' `
    --exclude='.env' `
    .

if (-not (Test-Path $archiveName)) {
    Write-Host "❌ Échec de la création de l'archive" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archive créée: $archiveName" -ForegroundColor Green

# Envoi vers le serveur
Write-Host "📤 Envoi vers le serveur..." -ForegroundColor Cyan
scp $archiveName "${ServerUser}@${ServerHost}:/tmp/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec de l'envoi" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archive envoyée" -ForegroundColor Green

# Déploiement sur le serveur
Write-Host "🔧 Déploiement sur le serveur..." -ForegroundColor Cyan

$sshCommands = @"
set -e
DEPLOY_PATH="$DeployPath"
APP_NAME="recipeme-app"

# Créer le dossier de déploiement
mkdir -p \$DEPLOY_PATH
cd \$DEPLOY_PATH

# Extraire l'archive
echo "📦 Extraction de l'archive..."
tar -xzf /tmp/$archiveName -C \$DEPLOY_PATH
rm /tmp/$archiveName

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

# Vérifier le statut
echo "✅ Vérification du statut..."
docker ps | grep \$APP_NAME

echo "✅ Déploiement terminé!"
"@

ssh "${ServerUser}@${ServerHost}" $sshCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec du déploiement" -ForegroundColor Red
    exit 1
}

# Nettoyer l'archive locale
Remove-Item $archiveName -Force
Write-Host "🧹 Archive locale supprimée" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Déploiement réussi!" -ForegroundColor Green
Write-Host "🌐 Application accessible via: https://$ServerHost/recipeMe" -ForegroundColor Cyan
