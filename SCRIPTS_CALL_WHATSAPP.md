# 📋 Scripts d'Appel — WhatsApp & LinkedIn

**Date**: 2026-07-09  
**Feature**: Sélection scripts call pour séquences multicanales  
**Commit**: `2a0e489`

---

## 🎯 PROBLÈME RÉSOLU

**Avant**: Message WhatsApp/LinkedIn hardcodé générique
```typescript
`Bonjour ${prenom}, suite à notre échange...`
```

**Après**: Sélection parmi tes scripts call_scripts stockés en DB

---

## 🚀 COMMENT ÇA MARCHE

### **1. CRM Kanban — Séquence active**

1. Ouvre `/crm`
2. Sélectionne un prospect avec séquence active
3. Dans le drawer (panneau latéral), section "Séquences de relance"
4. Tu vois les steps de la séquence (Email J+0, WhatsApp J+2, etc.)

### **2. Step WhatsApp/LinkedIn pending**

Pour les steps `whatsapp` ou `linkedin` en statut `pending`:
- **Avant**: Bouton "Ouvrir WA" → message hardcodé
- **Maintenant**: Bouton "📋 Script WA" (ou "📋 Script LI")

### **3. Modal sélection script**

Clique "📋 Script WA" → Modal s'ouvre avec:
- **Titre**: "SCRIPTS D'APPEL — [Nom du prospect]"
- **Liste des scripts** disponibles depuis `call_scripts` table
- **Preview** de chaque script (300 premiers caractères)
- **Badge métier** (kinesitherapeute, dentiste, etc.)
- **Hover effect** (bordure gold)

### **4. Sélection + Interpolation**

Clique sur un script → Automatique:
1. **Interpole** `[Prénom]` et `[Nom]` avec données du prospect
2. **Ouvre WhatsApp** (ou LinkedIn) avec le script complet
3. **Ferme** le modal

---

## 📝 SCRIPTS PAR DÉFAUT

5 scripts professionnels disponibles (seed automatique):

### **1. Kinésithérapeute libéral**
```
OUVERTURE (10 sec max)
"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine indépendant.
Je vous appelle parce que j'accompagne des kinésithérapeutes libéraux en 
Île-de-France sur l'optimisation fiscale et la préparation retraite.
Est-ce que vous avez 2 minutes ?"

SI OUI — QUALIFICATION (30 sec)
"Parfait. En tant que kiné libéral, vous avez sûrement un BNC conséquent.
Est-ce que vous avez déjà un conseiller qui s'occupe de votre PER Madelin..."
```

### **2. Chirurgien-dentiste**
```
OUVERTURE
"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine.
J'accompagne des chirurgiens-dentistes libéraux sur la structuration
patrimoniale et l'optimisation fiscale. Vous avez une minute ?"
```

### **3. Pharmacien titulaire**
```
OUVERTURE
"Bonjour [Prénom], c'est Ted, CGP indépendant. Je travaille avec des
pharmaciens titulaires en Île-de-France sur la valorisation du patrimoine
professionnel et la préparation de la cession. Vous avez 2 minutes ?"
```

### **4. Médecin libéral**
```
OUVERTURE
"Bonjour Docteur [Nom], c'est Ted, conseiller en gestion de patrimoine
indépendant. J'accompagne des médecins libéraux sur la prévoyance, la
retraite et l'optimisation fiscale. Vous avez une minute entre deux
consultations ?"
```

### **5. Infirmier(e) libéral(e)**
```
OUVERTURE
"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine.
J'accompagne des infirmiers libéraux en Île-de-France sur la retraite
et la fiscalité. Vous avez 2 minutes entre deux tournées ?"
```

---

## 🔧 TECHNIQUE

### **Architecture**

```
CRMPage (src/app/(dashboard)/crm/page.tsx)
  ↓ useState showScriptPicker (prospect + channel)
  ↓ useEffect → fetch /api/call-scripts → setCallScripts([...])
  ↓
  ↓ Props onOpenScriptPicker passée à ProspectDrawer
  ↓
ProspectDrawer (composant enfant)
  ↓ Séquences actives → Liste steps
  ↓ Step pending WhatsApp/LinkedIn
  ↓ Bouton "📋 Script WA" → onOpenScriptPicker(prospect, 'whatsapp')
  ↓
Modal ScriptPicker (dans CRMPage return)
  ↓ callScripts.map(script => ...)
  ↓ onClick script → Interpolation + openWhatsApp/openLinkedIn
  ↓ setShowScriptPicker(null) → Ferme modal
```

### **États React**

```typescript
const [showScriptPicker, setShowScriptPicker] = useState<{
  prospect: Prospect;
  channel: 'whatsapp' | 'linkedin'
} | null>(null)

const [callScripts, setCallScripts] = useState<Array<{
  id: string;
  metier: string;
  titre: string;
  contenu: string
}>>([])

const [scriptsLoading, setScriptsLoading] = useState(false)
```

### **API endpoint**

```
GET /api/call-scripts
→ Retourne tous scripts du user
→ Filtrage optionnel par metier (?metier=kinesitherapeute)
```

### **Interpolation variables**

```typescript
const prenom = prospect.nom.split(' ')[0]
const message = script.contenu
  .replace(/\[Prénom\]/g, prenom)
  .replace(/\[Nom\]/g, prospect.nom)
```

---

## 🎨 UI/UX

### **Bouton step**
- **Avant**: `Ouvrir WA` (vert #25D366)
- **Maintenant**: `📋 Script WA` (même couleur)

### **Modal**
- Background: `rgba(0,0,0,0.8)` overlay
- Panel: `C.bgMid` avec ribbon gold top
- Max width: `900px`
- Max height: `90vh` scroll auto
- Cards scripts: hover gold border

### **Script card**
- **Header**: Titre (Oswald 12px) + Badge métier (gold bg)
- **Preview**: 300 chars (JetBrains Mono 9px)
- **Hover**: Border gold + background surface2

---

## 📋 SEEDER LES SCRIPTS

### **Option 1: Via API (recommandé)**
```bash
curl -X POST "http://localhost:3000/api/call-scripts/seed" \
  -H "Cookie: sb-access-token=..." 

# Retour: {"success":true,"data":{"created":5,"skipped":0,"message":"5 scripts créés, 0 déjà présents"}}
```

### **Option 2: Via Supabase Dashboard**
```sql
-- Seed manuel si API inaccessible
INSERT INTO call_scripts (user_id, metier, titre, contenu, is_default)
VALUES (
  'your-user-uuid',
  'kinesitherapeute',
  'Prise de contact — Kinésithérapeute libéral',
  'OUVERTURE (10 sec max)...',
  true
);
```

---

## ✅ TESTS

### **1. Vérifier scripts chargés**
```bash
curl "http://localhost:3000/api/call-scripts" \
  -H "Cookie: sb-access-token=..."

# Attendu: {"success":true,"data":[{id,metier,titre,contenu},...]}
```

### **2. Test UI complet**
1. Aller sur `/crm`
2. Sélectionner prospect avec séquence active
3. Step WhatsApp J+2 pending → Cliquer "📋 Script WA"
4. **Vérifier**: Modal affiche 5 scripts (ou message "Aucun script")
5. Cliquer sur script "Kinésithérapeute"
6. **Vérifier**: WhatsApp s'ouvre avec script interpolé
7. **Vérifier**: `[Prénom]` remplacé par prénom réel du prospect

### **3. Fallback 0 scripts**
1. DELETE FROM call_scripts; (vider table)
2. Recharger `/crm` → Sélectionner prospect
3. Cliquer "📋 Script WA"
4. **Vérifier**: Message "Aucun script disponible" + lien Settings

---

## 🚀 ÉVOLUTIONS FUTURES

### **1. Créer scripts custom**
Ajouter page `/settings` section "Scripts d'appel":
- Formulaire: metier, titre, contenu
- POST `/api/call-scripts`
- Liste scripts existants + édition

### **2. Tags scripts**
```sql
ALTER TABLE call_scripts ADD COLUMN tags TEXT[];
```
Filtrer par tags (ex: "objection retraite", "premier contact")

### **3. Statistiques usage**
```sql
ALTER TABLE call_scripts ADD COLUMN usage_count INT DEFAULT 0;
```
Incrémenter à chaque utilisation → Top 3 scripts les plus utilisés

### **4. Variables avancées**
Remplacer aussi:
- `{{profession}}` → "Kinésithérapeute"
- `{{ville}}` → "Paris"
- `{{telephone}}` → "+33 6 12 34 56 78"

### **5. Preview live dans modal**
Afficher script avec variables déjà interpolées (preview temps réel)

---

## 📚 RÉFÉRENCES

**Fichiers modifiés**:
- `src/app/(dashboard)/crm/page.tsx` (145 lignes added)
- `src/app/api/call-scripts/route.ts` (GET + POST)
- `src/app/api/call-scripts/seed/route.ts` (5 scripts professionnels)

**Tables DB**:
- `call_scripts` (user_id, metier, titre, contenu, is_default)

**Migration**:
- `supabase/migrations/008_calling_sessions.sql` (table call_scripts)

---

## 🎉 RÉSULTAT

**Avant**: Message WhatsApp générique identique pour tous  
**Après**: Scripts professionnels personnalisés par métier TNS

**Impact utilisateur**:
- ✅ Gain de temps (pas besoin réécrire script à chaque fois)
- ✅ Qualité message (scripts structurés OUVERTURE/QUALIFICATION/CLOSING)
- ✅ Adaptabilité métier (5 scripts par défaut, extensible)
- ✅ Variables interpolées automatiques (prénom/nom)

**Prêt à l'emploi en production** 🚀
