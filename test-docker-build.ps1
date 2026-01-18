# Script de test local pour Docker
# Usage: .\test-docker-build.ps1

Write-Host "🧪 Test de build Docker local..." -ForegroundColor Blue
Write-Host ""

$ErrorActionPreference = "Stop"

# Vérifier que Docker est installé
Write-Host "🐳 Vérification de Docker..." -ForegroundColor Cyan
try {
    docker --version | Out-Null
    Write-Host "  ✅ Docker installé" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker n'est pas installé ou non disponible" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Construire l'image
Write-Host "🏗️  Construction de l'image Docker..." -ForegroundColor Cyan
Write-Host "  (Cela peut prendre quelques minutes...)" -ForegroundColor Gray

try {
    docker build -t recipeme-app:test . 2>&1 | Out-String | Write-Host
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Échec du build" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  ✅ Image construite avec succès" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Erreur lors du build: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Afficher la taille de l'image
Write-Host "📦 Informations sur l'image..." -ForegroundColor Cyan
docker images recipeme-app:test --format "  Taille: {{.Size}}"

Write-Host ""

# Proposer de tester le conteneur
Write-Host "✅ Build réussi!" -ForegroundColor Green
Write-Host ""
$test = Read-Host "Voulez-vous tester le conteneur localement? (o/N)"

if ($test -eq 'o' -or $test -eq 'O') {
    Write-Host ""
    Write-Host "🚀 Démarrage du conteneur de test..." -ForegroundColor Cyan
    Write-Host "  Note: Assurez-vous d'avoir un fichier .env local" -ForegroundColor Yellow
    Write-Host ""
    
    # Arrêter un éventuel conteneur précédent
    docker rm -f recipeme-app-test 2>$null | Out-Null
    
    # Démarrer le conteneur
    docker run -d `
        --name recipeme-app-test `
        -p 3002:3000 `
        --env-file .env `
        recipeme-app:test
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Conteneur démarré" -ForegroundColor Green
        Write-Host ""
        Write-Host "  📍 Application accessible sur: http://localhost:3002" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Pour voir les logs:" -ForegroundColor Gray
        Write-Host "    docker logs -f recipeme-app-test" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Pour arrêter le test:" -ForegroundColor Gray
        Write-Host "    docker rm -f recipeme-app-test" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "  ❌ Échec du démarrage" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "Pour tester manuellement:" -ForegroundColor Gray
    Write-Host "  docker run -d --name recipeme-app-test -p 3002:3000 --env-file .env recipeme-app:test" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Pour nettoyer:" -ForegroundColor Gray
    Write-Host "  docker rmi recipeme-app:test" -ForegroundColor Gray
    Write-Host ""
}
