# SMS Bridge Server - Envoi SMS Gratuit via iPhone

## 🎯 Concept

Serveur local Python qui permet au Dashboard d'envoyer des SMS **gratuitement** via ton iPhone, sans API payante.

**Architecture** :
```
Dashboard → POST http://localhost:5001/sms/send
  ↓
Serveur Python Flask (ce dossier)
  ↓
Ouvre URL scheme shortcuts://...
  ↓
App Raccourcis sur iPhone
  ↓
SMS envoyé (utilise ton forfait mobile)
```

---

## 📦 Installation

### 1. Installer Python (si pas déjà fait)

1. Télécharge Python : https://www.python.org/downloads/
2. Pendant l'installation : **COCHE "Add Python to PATH"**
3. Vérifie : ouvre PowerShell → tape `python --version`

### 2. Installer les dépendances

```powershell
cd "C:\Users\Ted\Documents\Obsidian Vault\TedScaleWithOuss\sms-bridge"
pip install -r requirements.txt
```

---

## 🚀 Lancer le Serveur

```powershell
cd "C:\Users\Ted\Documents\Obsidian Vault\TedScaleWithOuss\sms-bridge"
python server.py
```

Tu verras :
```
SMS Bridge Server - Démarré sur http://localhost:5001
```

**Garde cette fenêtre PowerShell ouverte** tant que tu utilises le Dashboard.

---

## 📱 Configuration iPhone (Raccourci iOS)

### Créer le Raccourci "EnvoiSMS"

1. **Ouvre l'app "Raccourcis"** sur ton iPhone
2. **Clique sur "+"** (en haut à droite) pour créer un nouveau raccourci
3. **Nom du raccourci** : `EnvoiSMS` (exactement comme ça, sensible à la casse)
4. **Ajoute ces actions** (dans l'ordre) :

#### Action 1 : Obtenir l'entrée du raccourci
- Recherche : "Obtenir l'entrée du raccourci"
- Ajoute cette action

#### Action 2 : Diviser le texte
- Recherche : "Diviser le texte"
- Ajoute cette action
- Séparateur personnalisé : `|` (barre verticale)
- Applique à : "Entrée du raccourci"

#### Action 3 : Obtenir le numéro (élément 1)
- Recherche : "Obtenir l'élément de la liste"
- Ajoute cette action
- Obtenir : **Premier élément**
- De la liste : "Texte divisé"
- → Renomme cette variable en "Numéro"

#### Action 4 : Obtenir le message (élément 2)
- Recherche : "Obtenir l'élément de la liste"
- Ajoute cette action  
- Obtenir : **Dernier élément**
- De la liste : "Texte divisé"
- → Renomme cette variable en "Message"

#### Action 5 : Envoyer le SMS
- Recherche : "Envoyer un message"
- Ajoute cette action
- Message : `Message` (variable)
- Destinataire : `Numéro` (variable)
- **IMPORTANT** : Désactive "Afficher lors de l'exécution" pour envoi automatique

5. **Clique sur "OK"** pour sauvegarder

---

## 🧪 Test Manuel

### Test 1 : Health Check

```powershell
curl http://localhost:5001/health
```

Réponse attendue :
```json
{"status": "ok", "service": "SMS Bridge Server"}
```

### Test 2 : Envoyer un SMS de test

```powershell
curl -X POST http://localhost:5001/sms/send `
  -H "Content-Type: application/json" `
  -d '{\"phone\": \"0612345678\", \"message\": \"Test SMS depuis Dashboard\"}'
```

**Ce qui doit se passer** :
1. Serveur Python reçoit la requête
2. Ouvre l'app Raccourcis sur ton iPhone (si connecté au même WiFi)
3. SMS envoyé automatiquement

---

## 🔗 Intégration Dashboard

Le Dashboard est déjà configuré pour utiliser ce serveur.

**Variable d'environnement à ajouter** :

Dans `.env.local` :
```
SMS_BRIDGE_URL=http://localhost:5001
```

**Code Dashboard** (déjà implémenté dans `/api/nurturing/send-sms`) :
```typescript
const response = await fetch(`${process.env.SMS_BRIDGE_URL}/sms/send`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone, message })
})
```

---

## 🔄 Lancer Automatiquement au Démarrage Windows

### Option 1 : Tâche Planifiée Windows

1. **Ouvre** : Planificateur de tâches Windows
2. **Créer une tâche de base**
3. **Nom** : "SMS Bridge Server"
4. **Déclencheur** : À l'ouverture de session
5. **Action** : Démarrer un programme
6. **Programme** : `python.exe`
7. **Arguments** : `"C:\Users\Ted\Documents\Obsidian Vault\TedScaleWithOuss\sms-bridge\server.py"`
8. **OK**

### Option 2 : Raccourci dans Démarrage

1. Crée un fichier `start-sms-bridge.bat` :
```batch
@echo off
cd "C:\Users\Ted\Documents\Obsidian Vault\TedScaleWithOuss\sms-bridge"
python server.py
pause
```

2. Copie ce fichier dans : `C:\Users\Ted\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

---

## 📊 Logs & Monitoring

Le serveur affiche les logs dans la console :
```
INFO:__main__:Envoi SMS vers +33612345678: Bonjour Jean, votre RDV est confirmé...
```

---

## 🐛 Dépannage

### Problème : "Module flask not found"
**Solution** : `pip install -r requirements.txt`

### Problème : "Port 5001 already in use"
**Solution** : Change le port dans `server.py` ligne 92 : `app.run(..., port=5002)`

### Problème : Raccourci ne se déclenche pas
**Solution** : 
- Vérifie que l'iPhone et le PC sont sur le même WiFi
- Vérifie que le Raccourci s'appelle exactement "EnvoiSMS"
- Active "Autoriser les raccourcis non fiables" dans Réglages iOS

---

## ✅ Checklist Finale

- [ ] Python installé
- [ ] `pip install -r requirements.txt` exécuté
- [ ] Serveur lancé (`python server.py`)
- [ ] Raccourci "EnvoiSMS" créé sur iPhone
- [ ] Test manuel réussi
- [ ] Dashboard .env.local mis à jour avec `SMS_BRIDGE_URL`
- [ ] Serveur lance automatiquement au démarrage (optionnel)

---

**Coût total** : 0€ (utilise forfait mobile iPhone)
**SMS illimités** : Oui (selon forfait mobile)
**Automatisation** : 95% (juste avoir iPhone à proximité)
