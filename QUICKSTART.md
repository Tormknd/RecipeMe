# 🚀 Guide de Déploiement Rapide

## Pour déployer RecipeMe en 5 minutes

### Prérequis

- Accès SSH à votre serveur Hetzner
- Docker et Docker Compose installés sur le serveur
- Nginx configuré sur le serveur
- L'API `recipeme-scraper` déjà en ligne

### Étape 1 : Configuration du serveur (À FAIRE UNE SEULE FOIS)

#### Option A : Script automatique (recommandé)

1. Envoyez le script d'initialisation sur le serveur :

```powershell
scp server-init.sh root@chhaju.fr:/tmp/
```

2. Connectez-vous au serveur et exécutez le script :

```bash
ssh root@chhaju.fr
chmod +x /tmp/server-init.sh
/tmp/server-init.sh
```

Le script va :
- ✅ Vérifier Docker et Docker Compose
- ✅ Créer le dossier `/opt/recipeme`
- ✅ Configurer les variables d'environnement
- ✅ Créer le réseau Docker
- ✅ Vous guider pour configurer Nginx

#### Option B : Configuration manuelle

Sur votre serveur Hetzner, suivez [`SERVER-CONFIG.md`](./SERVER-CONFIG.md) pour :

1. Configurer Nginx avec le basePath `/recipeMe`
2. Créer le fichier `.env` dans `/opt/recipeme/` avec votre clé Gemini
3. Vérifier que `recipeme-scraper` est accessible

### Étape 2 : Vérification pré-déploiement (OPTIONNEL)

Depuis Windows (PowerShell) :

```powershell
.\pre-deploy-check.ps1
```

Cela vérifie que tout est prêt pour le déploiement.

### Étape 3 : Déploiement

Depuis Windows (PowerShell) :

```powershell
.\deploy.ps1
```

Ce script va :
- ✅ Créer une archive du projet
- ✅ L'envoyer sur le serveur
- ✅ Construire l'image Docker
- ✅ Démarrer les conteneurs
- ✅ Appliquer les migrations de base de données

**Durée estimée** : 2-3 minutes

### Étape 4 : Vérification

Ouvrez votre navigateur et accédez à :

```
https://chhaju.fr/recipeMe
```

## En cas de problème

### Voir les logs

Sur le serveur :

```bash
docker logs recipeme-app -f
```

### Redémarrer l'application

Sur le serveur :

```bash
cd /opt/recipeme
docker-compose restart recipeme-app
```

### Support complet

Consultez [`DEPLOY.md`](./DEPLOY.md) pour le guide complet avec toutes les options et le troubleshooting détaillé.

## Architecture

```
Windows (votre PC)
    ↓ deploy.ps1
Serveur Hetzner
    ↓
Nginx (chhaju.fr)
    ↓ /recipeMe
Docker Container (recipeme-app:3002)
    ↓
Docker Container (recipeme-scraper:5000)
```

## Mise à jour de l'application

Pour mettre à jour après avoir fait des modifications :

1. Commit vos changements (optionnel)
2. Relancez simplement `.\deploy.ps1`

C'est tout ! 🎉
