# Script de vérification pré-déploiement
# Usage: .\pre-deploy-check.ps1

param(
    [string]$ServerHost = "chhaju.fr",
    [string]$ServerUser = "root"
)

Write-Host "🔍 Vérification de la configuration de déploiement..." -ForegroundColor Blue
Write-Host ""

$issues = @()
$warnings = @()

# Vérifier les fichiers requis localement
Write-Host "📁 Vérification des fichiers locaux..." -ForegroundColor Cyan

$requiredFiles = @(
    "Dockerfile",
    "docker-compose.yml",
    "docker-entrypoint.sh",
    "package.json",
    "next.config.ts",
    "prisma/schema.prisma"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file manquant" -ForegroundColor Red
        $issues += "Fichier manquant: $file"
    }
}

# Vérifier que .env existe (mais ne pas l'afficher)
if (Test-Path ".env") {
    Write-Host "  ⚠️  .env existe localement (ne sera pas déployé)" -ForegroundColor Yellow
    $warnings += "Assurez-vous d'avoir un .env sur le serveur"
}

Write-Host ""

# Vérifier la connexion SSH
Write-Host "🔐 Vérification de la connexion SSH..." -ForegroundColor Cyan
$sshTest = ssh -o ConnectTimeout=5 "${ServerUser}@${ServerHost}" "echo 'OK'" 2>&1

if ($LASTEXITCODE -eq 0 -and $sshTest -eq "OK") {
    Write-Host "  ✅ Connexion SSH fonctionnelle" -ForegroundColor Green
} else {
    Write-Host "  ❌ Impossible de se connecter via SSH" -ForegroundColor Red
    $issues += "Connexion SSH échouée"
}

Write-Host ""

# Vérifier Docker sur le serveur
Write-Host "🐳 Vérification de Docker sur le serveur..." -ForegroundColor Cyan
$dockerCheck = ssh "${ServerUser}@${ServerHost}" "docker --version && docker-compose --version" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Docker installé" -ForegroundColor Green
    Write-Host "  $($dockerCheck -split "`n" | Select-Object -First 2)" -ForegroundColor Gray
} else {
    Write-Host "  ❌ Docker non disponible sur le serveur" -ForegroundColor Red
    $issues += "Docker n'est pas installé sur le serveur"
}

Write-Host ""

# Vérifier si recipeme-scraper tourne
Write-Host "🔌 Vérification de recipeme-scraper..." -ForegroundColor Cyan
$scraperCheck = ssh "${ServerUser}@${ServerHost}" "docker ps | grep recipeme-scraper" 2>&1

if ($LASTEXITCODE -eq 0 -and $scraperCheck) {
    Write-Host "  ✅ recipeme-scraper en cours d'exécution" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  recipeme-scraper ne semble pas tourner" -ForegroundColor Yellow
    $warnings += "recipeme-scraper n'est pas en cours d'exécution"
}

Write-Host ""

# Vérifier Nginx
Write-Host "🌐 Vérification de Nginx..." -ForegroundColor Cyan
$nginxCheck = ssh "${ServerUser}@${ServerHost}" "nginx -v && systemctl is-active nginx" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Nginx actif" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Nginx non disponible ou inactif" -ForegroundColor Yellow
    $warnings += "Nginx n'est pas actif sur le serveur"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

# Résumé
if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ Tous les tests sont passés!" -ForegroundColor Green
    Write-Host "   Vous pouvez procéder au déploiement." -ForegroundColor Green
    exit 0
} elseif ($issues.Count -eq 0) {
    Write-Host "⚠️  Avertissements ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   - $warning" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "   Vous pouvez continuer, mais vérifiez ces points." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ Problèmes détectés ($($issues.Count)):" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   - $issue" -ForegroundColor Red
    }
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Avertissements ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   - $warning" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    Write-Host "   Corrigez ces problèmes avant de déployer." -ForegroundColor Red
    exit 1
}
