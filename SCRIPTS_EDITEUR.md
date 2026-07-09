# 📝 Éditeur de Scripts — CRM Kanban

**Date**: 2026-07-09  
**Feature**: Créer, modifier et enregistrer des scripts call directement depuis la modal  
**Commit**: `580ff99`

---

## ✨ NOUVEAUTÉS

### **1. Fix interpolation [Nom]**

**Avant**: `[Nom]` = nom complet ("Dupont Martin")  
**Après**: `[Nom]` = nom de famille uniquement ("Dupont")

```typescript
const nomComplet = "Martin Dupont"
const parts = nomComplet.split(' ')
const prenom = parts[0]           // "Martin"
const nomFamille = parts.slice(1).join(' ')  // "Dupont"
```

**Exemple pour Dr. Martin Dupont (médecin)** :
- `[Prénom]` → "Martin"
- `[Nom]` → "Dupont"
- `Docteur [Nom]` → "Docteur Dupont" ✅ (plus "Docteur Martin Dupont")
- `Bonjour [Prénom]` → "Bonjour Docteur Dupont" (intelligent pour médecins/dentistes)

---

### **2. Bouton "+ NOUVEAU SCRIPT"**

Dans la modal de sélection de scripts (Actions rapides → Script WhatsApp), en haut à droite :

```
SCRIPTS D'APPEL — Martin Dupont
Sélectionne un script pour WhatsApp          [+ NOUVEAU SCRIPT]
```

Clique → Ouvre l'éditeur vierge pour créer un nouveau script.

---

### **3. Bouton "✎ Modifier" sur chaque script**

Chaque carte de script affiche maintenant :

```
┌─────────────────────────────────────────────────────┐
│ Variante A — Approche directe    [✎ Modifier]  [kinesitherapeute] │
│                                                     │
│ OUVERTURE                                          │
│ "Bonjour [Prénom], c'est Ted..."                  │
└─────────────────────────────────────────────────────┘
```

Clique "✎ Modifier" → Ouvre l'éditeur pré-rempli avec le contenu existant.

---

### **4. Modal éditeur de script**

**Champs** :
- **Métier** : `kinesitherapeute`, `medecin`, `dentiste`, `pharmacien`, `infirmier`
- **Titre** : "Variante A — Approche directe BNC"
- **Script** : Textarea 18 lignes avec structure OUVERTURE / QUALIFICATION / PITCH / OBJECTIONS / CLOSING

**Variables disponibles** (affichées en haut) :
- `[Prénom]` → prénom du prospect
- `[Nom]` → nom de famille
- `Docteur [Nom]` → intelligent (médecin/dentiste uniquement)

**Actions** :
- **ANNULER** → Ferme sans sauvegarder
- **✓ CRÉER** (nouveau script) ou **💾 ENREGISTRER** (modification)

---

## 🔧 TECHNIQUE

### **États React ajoutés**

```typescript
const [showScriptEditor, setShowScriptEditor] = useState(false)
const [editingScript, setEditingScript] = useState<{
  id?: string
  metier: string
  titre: string
  contenu: string
}>({ metier: '', titre: '', contenu: '' })
const [scriptEditorLoading, setScriptEditorLoading] = useState(false)
```

### **Workflow création/modification**

```
1. Utilisateur clique "+ NOUVEAU SCRIPT" ou "✎ Modifier"
   ↓
2. setEditingScript({ id?, metier, titre, contenu })
   setShowScriptEditor(true)
   setShowScriptPicker(null)
   ↓
3. Modal éditeur s'affiche (zIndex 10001 > preview 10000 > picker 9999)
   ↓
4. Utilisateur remplit les champs
   ↓
5. Clique "✓ CRÉER" ou "💾 ENREGISTRER"
   ↓
6. API: POST /api/call-scripts (nouveau) ou PATCH /api/call-scripts/[id] (modification)
   ↓
7. Recharge liste scripts via GET /api/call-scripts
   ↓
8. Ferme éditeur, réaffiche modal picker avec nouveau script
```

### **API PATCH ajoutée**

**Fichier**: `src/app/api/call-scripts/[id]/route.ts`

**Changements** :
- `PUT` → `PATCH` (RESTful standard pour partial update)
- Ajout `metier` dans le body (permet de changer la catégorie du script)

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params

  let body: { metier?: string; titre?: string; contenu?: string; is_default?: boolean }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('call_scripts')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
    .select().single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
```

---

## 📋 EXEMPLE WORKFLOW COMPLET

### **Créer un nouveau script**

1. Ouvre `/crm`
2. Sélectionne un prospect (ex: Dr. Martin Dupont, médecin)
3. Clique **💬 Script WhatsApp** (Actions rapides)
4. Clique **+ NOUVEAU SCRIPT** (en haut à droite)
5. Remplit :
   - Métier : `medecin`
   - Titre : `Variante D — Question choc retraite`
   - Script :
   ```
   OUVERTURE
   "Bonjour Docteur [Nom], c'est Ted. Question choc : vous savez combien vous toucherez à la retraite avec la CARMF ?"

   PITCH
   "La plupart des médecins découvrent : max 2 500 €/mois. Même avec un BNC de 15 000 €/mois aujourd'hui."

   CLOSING
   "Je vous propose un diagnostic gratuit en 15 min pour voir si vous êtes concerné."
   ```
6. Clique **✓ CRÉER**
7. → Script ajouté à la liste
8. Modal se rouvre automatiquement avec les 16 scripts (15 + 1 nouveau)

### **Modifier un script existant**

1. Ouvre modal scripts (comme ci-dessus)
2. Survole un script → Clique **✎ Modifier**
3. Change le titre : "Variante A — Approche directe BNC" → "Variante A — BNC + PER Madelin"
4. Ajoute une ligne dans OBJECTIONS :
   ```
   "J'ai déjà un PER" → "Oui mais est-il optimisé fiscalement pour les TNS ? On peut comparer en 10 min."
   ```
5. Clique **💾 ENREGISTRER**
6. → Script mis à jour dans la liste

### **Utiliser le script modifié**

1. Sélectionne le script modifié
2. Preview s'affiche avec variables interpolées :
   - `[Prénom]` → "Martin"
   - `Docteur [Nom]` → "Docteur Dupont"
3. Clique **📱 OUVRIR WHATSAPP**
4. → WhatsApp s'ouvre avec le message complet

---

## ✅ AMÉLIORATIONS

**Avant** :
- Scripts hardcodés dans `seed/route.ts`
- Impossible de modifier sans redéploiement
- `[Nom]` incorrectement remplacé par nom complet

**Après** :
- ✅ Éditeur in-app pour créer/modifier des scripts
- ✅ `[Nom]` = nom de famille uniquement (protocole correct)
- ✅ Modifications instantanées sans redéploiement
- ✅ Bouton "✎ Modifier" sur chaque script
- ✅ Variables affichées en aide visuelle
- ✅ Textarea 18 lignes pour structure complète
- ✅ API PATCH pour updates partiels
- ✅ Rechargement automatique de la liste après sauvegarde

---

## 🎯 VARIANTES DISPONIBLES PAR DÉFAUT

**15 scripts seedés** (via POST `/api/call-scripts/seed`) :

| Métier | Scripts |
|--------|---------|
| **Kinésithérapeute** | A: Approche BNC, B: Retraite CARPIMKO, C: Social proof cabinet (6 800 €) |
| **Dentiste** | A: BNC + SCM, B: Prévoyance CARCDSF, C: Social proof (11 200 €) |
| **Pharmacien** | A: Valorisation officine, B: Diversification patrimoine |
| **Médecin** | A: Prévoyance CARMF, B: Retraite CARMF, C: Social proof secteur 2 (13 400 €) |
| **Infirmier** | A: Retraite CARPIMKO, B: Charges sociales, C: Social proof tournées (4 200 €) |

**Total** : 15 scripts par défaut + possibilité d'en créer autant que voulu.

---

## 🚀 DÉPLOIEMENT

### **Local** (déjà testé)
```bash
npm run build  # ✅ Compilation réussie
npm run start  # Serveur standalone
```

### **Production Cloud Run**
```bash
# 1. Build image Docker
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://vqtzcxvmzznbepyvlcut.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  -t europe-west1-docker.pkg.dev/integration-make-365608/cloud-run-source-deploy/ted-scale-with-ouss:latest .

# 2. Push image
docker push europe-west1-docker.pkg.dev/integration-make-365608/cloud-run-source-deploy/ted-scale-with-ouss:latest

# 3. Deploy
gcloud run deploy ted-scale-with-ouss \
  --image europe-west1-docker.pkg.dev/integration-make-365608/cloud-run-source-deploy/ted-scale-with-ouss:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=...,CRON_SECRET=..." \
  --project integration-make-365608
```

### **Seeder les 15 scripts par défaut**
Via console navigateur (F12) une fois connecté :
```javascript
fetch('/api/call-scripts/seed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}'
}).then(r => r.json()).then(console.log)

// → {"success":true,"data":{"created":15,"skipped":0,"message":"15 scripts créés, 0 déjà présents"}}
```

---

## 📚 FICHIERS MODIFIÉS

**Frontend** :
- `src/app/(dashboard)/crm/page.tsx` (+153 lignes)
  - Fix interpolation `[Nom]` = nom de famille
  - Bouton "+ NOUVEAU SCRIPT"
  - Bouton "✎ Modifier" sur chaque carte
  - Modal éditeur complet (zIndex 10001)
  - États `showScriptEditor`, `editingScript`, `scriptEditorLoading`

**Backend** :
- `src/app/api/call-scripts/[id]/route.ts`
  - `PUT` → `PATCH` (RESTful standard)
  - Ajout `metier` dans body params

**Documentation** :
- `SCRIPTS_VARIANTES_PERSONNALISATION.md` (15 variantes)
- `SCRIPTS_CALL_WHATSAPP.md` (sélection scripts)
- `SCRIPTS_EDITEUR.md` (ce fichier)

---

## 🎉 RÉSULTAT

**Avant** :
- Scripts en dur, `[Nom]` = nom complet (incorrect pour "Docteur")
- Modification = redéploiement app

**Après** :
- ✅ Éditeur in-app (création + modification)
- ✅ `[Nom]` = nom de famille (protocole correct)
- ✅ Modifications instantanées
- ✅ 15 scripts par défaut + extensible à l'infini
- ✅ Preview avant envoi avec variables interpolées
- ✅ API PATCH pour updates partiels

**Prêt pour production** 🚀
