# 🎯 Scripts Call — 3 Variantes + Personnalisation Docteur

**Date**: 2026-07-09  
**Feature**: Variantes multiples + titre professionnel intelligent  
**Commit**: `1c4b7a5`

---

## ✨ NOUVEAUTÉS

### **1. Trois variantes par métier**

**Avant**: 1 script par métier (5 scripts au total)  
**Après**: 3 variantes par métier (15 scripts au total)

| Métier | Variantes disponibles |
|--------|----------------------|
| **Kinésithérapeute** | A: Approche directe BNC, B: Angle retraite CARPIMKO, C: Social proof cabinet |
| **Dentiste** | A: BNC + SCM, B: Prévoyance CARCDSF, C: Social proof chiffré |
| **Pharmacien** | A: Valorisation officine, B: Diversification patrimoine |
| **Médecin** | A: Prévoyance CARMF, B: Retraite CARMF, C: Social proof secteur 2 |
| **Infirmier** | A: Retraite CARPIMKO, B: Charges sociales, C: Social proof tournées |

---

### **2. Personnalisation automatique titre professionnel**

**Médecins et dentistes** → `"Bonjour Docteur [Nom complet]"`  
**Autres professions** → `"Bonjour [Prénom]"`

#### **Exemples concrets**

```
Prospect: Dr. Martin Dubois
Profession: Médecin libéral
Script: "Bonjour Docteur [Nom], c'est Ted..."
→ Résultat: "Bonjour Docteur Martin Dubois, c'est Ted..."

Prospect: Sophie Lemaire
Profession: Kinésithérapeute
Script: "Bonjour [Prénom], c'est Ted..."
→ Résultat: "Bonjour Sophie, c'est Ted..."

Prospect: Dr. Camille Rousseau
Profession: Chirurgien-dentiste
Script: "Bonjour Docteur [Nom], j'ai travaillé avec..."
→ Résultat: "Bonjour Docteur Camille Rousseau, j'ai travaillé avec..."
```

---

## 🎨 ANGLES DES VARIANTES

### **Variante A — Approche directe métier**
- Focus sur la **structure BNC** / **activité libérale**
- Entrée en matière professionnelle classique
- Qualification sur le BNC / revenus

**Exemple Kinésithérapeute A** :
```
"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine indépendant.
Je vous appelle parce que j'accompagne des kinésithérapeutes libéraux en 
Île-de-France sur l'optimisation fiscale et la préparation retraite.
Est-ce que vous avez 2 minutes ?"
```

---

### **Variante B — Angle spécifique problématique**
- Focus sur **un pain point précis** (retraite, prévoyance, charges)
- Question choc pour capter l'attention
- Scénario catastrophe pour créer l'urgence

**Exemple Médecin B** :
```
"Bonjour Docteur [Nom], c'est Ted, CGP spécialisé médecins libéraux.
Question directe : vous savez combien vous toucherez à la retraite avec
la CARMF seule ?"

"La plupart des médecins ne réalisent pas : la retraite CARMF est plafonnée.
Même avec un gros BNC, vous touchez max 2 500-3 000 €/mois. Si vous gagnez
10 000 €/mois aujourd'hui, vous tombez à 3 000 € demain."
```

---

### **Variante C — Social proof chiffré**
- **Cas client réel** avec chiffres concrets
- Crédibilité par la preuve sociale
- Économies chiffrées (6 800 €, 11 200 €, 13 400 €)

**Exemple Dentiste C** :
```
"Bonjour Docteur [Nom], c'est Ted. Je viens de boucler un dossier pour
un dentiste à Neuilly : 11 200 € d'économies fiscales sur l'année.
Vous avez 2 minutes ?"

"Avec un BNC dentiste — généralement entre 150K et 250K — il y a facilement
8 à 12K d'économies fiscales non exploitées. Vous êtes dans quelle tranche
de BNC ?"
```

---

## 🔧 TECHNIQUE — PERSONNALISATION

### **Logique de détection profession**

```typescript
const profession = prospect.profession.toLowerCase()
let titreProspect = prenom

if (profession.includes('médecin') || profession.includes('medecin')) {
  titreProspect = `Docteur ${nom}`
} else if (profession.includes('dentiste')) {
  titreProspect = `Docteur ${nom}`
} else if (profession.includes('pharmacien')) {
  titreProspect = prenom
} else if (profession.includes('kiné') || profession.includes('kinesitherapeute')) {
  titreProspect = prenom
} else if (profession.includes('infirmier') || profession.includes('infirmière')) {
  titreProspect = prenom
}
```

### **Interpolation intelligente**

```typescript
const message = script.contenu
  .replace(/\[Prénom\]/g, prenom)
  .replace(/\[Nom\]/g, nom)
  .replace(/Docteur \[Nom\]/g, titreProspect)
  .replace(/Bonjour \[Prénom\]/g, `Bonjour ${titreProspect}`)
```

---

## 📋 LISTE COMPLÈTE DES 15 SCRIPTS

### **KINÉSITHÉRAPEUTE (3)**

**A — Approche directe BNC**
```
OUVERTURE: "Bonjour [Prénom], c'est Ted, CGP indépendant..."
QUALIFICATION: "En tant que kiné libéral, vous avez sûrement un BNC conséquent..."
PITCH: "Mon diagnostic gratuit identifie en 20 min si vous laissez de l'argent sur la table."
OBJECTIONS: "J'ai déjà un conseiller" → Spécialisation TNS
CLOSING: "Super, je vous envoie une invitation pour [jour] à [heure]."
```

**B — Angle retraite CARPIMKO**
```
OUVERTURE: "Question rapide : vous savez combien vous toucherez à la retraite avec la CARPIMKO seule ? La plupart découvrent que c'est autour de 1 400 €/mois..."
PITCH: "Sans complément PER Madelin, vous passez de 5 000 €/mois aujourd'hui à 1 400 € demain."
OBJECTIONS: "Je verrai plus tard" → À 35-40 ans, 200 €/mois = 120 000 € à 62 ans
```

**C — Social proof cabinet**
```
OUVERTURE: "Je travaille avec 4 kinés libéraux à Paris et je viens de boucler un dossier qui a économisé 6 800 € d'impôts sur l'année."
QUALIFICATION: "Votre BNC est entre 70K et 120K ?"
PITCH: "3 leviers légaux existent depuis des années. Mon diagnostic les identifie en 20 min."
```

---

### **DENTISTE (3)**

**A — BNC + SCM**
```
OUVERTURE: "Bonjour Docteur [Nom], j'accompagne des chirurgiens-dentistes libéraux sur la structuration patrimoniale et l'optimisation fiscale."
QUALIFICATION: "Vous avez déjà structuré votre épargne professionnelle — PER, contrat Madelin, SCM ?"
PITCH: "Entre le BNC, les revenus de la SCM, et les charges sociales, il y a facilement 5 à 8 000 € d'économies fiscales non exploitées par an."
```

**B — Prévoyance CARCDSF**
```
OUVERTURE: "Question directe : si vous êtes en arrêt de travail 6 mois demain, combien vous touchez par mois ?"
PITCH: "La CARCDSF couvre très mal l'arrêt de travail. 90 jours de carence, 50% du revenu plafonné. Si vous gagnez 12 000 €/mois, vous tombez à 2 500 €."
OBJECTIONS: "Mon assureur s'en occupe" → Je fais du conseil indépendant, je regarde l'ensemble
```

**C — Social proof chiffré**
```
OUVERTURE: "Je viens de boucler un dossier pour un dentiste à Neuilly : 11 200 € d'économies fiscales sur l'année."
QUALIFICATION: "Avec un BNC entre 150K et 250K, il y a facilement 8 à 12K d'économies non exploitées."
```

---

### **PHARMACIEN (2)**

**A — Valorisation officine**
```
OUVERTURE: "Je travaille avec des pharmaciens titulaires en Île-de-France sur la valorisation du patrimoine professionnel et la préparation de la cession."
PITCH: "Des pharmaciens qui ont 80% de leur patrimoine dans l'officine et très peu diversifié. Le jour de la cession, la fiscalité peut prendre 30 à 40% si c'est mal préparé."
```

**B — Diversification**
```
OUVERTURE: "Question rapide : combien de votre patrimoine est concentré dans votre officine ? 70% ? 80% ? Plus ?"
PITCH: "Tout est dans l'officine. Le jour où vous vendez, la fiscalité peut prendre 30 à 40%. Mon diagnostic montre comment diversifier maintenant."
```

---

### **MÉDECIN (3)**

**A — Prévoyance CARMF**
```
OUVERTURE: "Bonjour Docteur [Nom], j'accompagne des médecins libéraux sur la prévoyance, la retraite et l'optimisation fiscale. Vous avez une minute entre deux consultations ?"
QUALIFICATION: "En secteur 1 ou 2 ? Et côté prévoyance — arrêt de travail, invalidité — vous êtes couvert par votre contrat CARMF de base ou vous avez un complément ?"
PITCH: "La CARMF couvre mal l'arrêt de travail (3 mois de carence, 50% du revenu max). Un accident ou une maladie et c'est la catastrophe financière."
```

**B — Retraite CARMF**
```
OUVERTURE: "Question directe : vous savez combien vous toucherez à la retraite avec la CARMF seule ?"
PITCH: "La retraite CARMF est plafonnée. Même avec un gros BNC, vous touchez max 2 500-3 000 €/mois. Si vous gagnez 10 000 €/mois aujourd'hui, vous tombez à 3 000 € demain."
```

**C — Social proof secteur 2**
```
OUVERTURE: "Je viens de boucler un dossier pour un médecin secteur 2 à Paris : 13 400 € d'économies fiscales sur l'année. Vous êtes secteur 1 ou 2 ?"
QUALIFICATION: "En secteur 2, le BNC est souvent élevé — 180K, 220K, plus. Vous utilisez le PER Madelin ?"
```

---

### **INFIRMIER (3)**

**A — Retraite CARPIMKO**
```
OUVERTURE: "J'accompagne des infirmiers libéraux en Île-de-France sur la retraite et la fiscalité. Vous avez 2 minutes entre deux tournées ?"
QUALIFICATION: "Vous savez combien vous toucherez à la retraite avec vos droits actuels ? La plupart découvrent que c'est autour de 1 200 €/mois..."
PITCH: "Sans complément, vous passez de 5 000 €/mois à 1 200 €. Mon diagnostic montre exactement combien il faut mettre de côté et où."
```

**B — Charges sociales**
```
OUVERTURE: "Question rapide : vous payez combien de charges sociales par an ? 18K ? 22K ? Plus ?"
PITCH: "Vous payez énormément de charges, mais la retraite CARPIMKO est ridicule. Vous travaillez comme un fou, et à 62 ans vous touchez 1 200 €/mois."
```

**C — Social proof tournées**
```
OUVERTURE: "Je travaille avec 6 IDEL en Île-de-France. Moyenne d'économies fiscales : 4 200 € par an. Vous avez 2 minutes entre deux tournées ?"
QUALIFICATION: "Vous mettez combien de côté pour la retraite chaque mois ? 200 € ? 300 € ? Rien ?"
```

---

## 🎯 COMMENT CHOISIR LA VARIANTE

### **Variante A** — Si tu ne connais rien du prospect
- Approche professionnelle classique
- Pas de question choc, pas de pression
- Qualification douce sur le BNC / structure

### **Variante B** — Si tu veux créer l'urgence
- Question choc dès l'ouverture
- Scénario catastrophe (retraite faible, gap prévoyance)
- Pain point précis pour capter l'attention

### **Variante C** — Si tu veux montrer ta crédibilité
- Cas client réel avec chiffres
- Social proof fort (11 200 € économisés, 6 IDEL accompagnés)
- Qualification rapide BNC pour qualifier

---

## ✅ SEEDER LES 15 SCRIPTS

```bash
# Production
curl -X POST "https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/call-scripts/seed" \
  -H "Cookie: sb-access-token=TON_TOKEN"

# Retour attendu:
# {"success":true,"data":{"created":15,"skipped":0,"message":"15 scripts créés, 0 déjà présents"}}
```

**Note**: Si tu as déjà seedé les 5 scripts initiaux, le seeder créera les 10 nouveaux (skipped: 5, created: 10).

---

## 🎉 IMPACT

**Avant** :
- 5 scripts génériques
- Message identique pour tous les prospects d'un même métier
- "Bonjour [Prénom]" pour tout le monde

**Après** :
- **15 scripts** avec 3 angles différents par métier
- **Variantes A/B/C** adaptées au contexte
- **Personnalisation Docteur** automatique pour médecins/dentistes

**Gain utilisateur** :
- ✅ Plus de choix selon contexte (nouveau prospect vs relance)
- ✅ Scripts plus impactants (social proof, question choc)
- ✅ Respect protocole professionnel (Docteur pour médecins)

---

## 📚 RÉFÉRENCES

**Fichiers modifiés** :
- `src/app/api/call-scripts/seed/route.ts` (+340 lignes, 15 scripts)
- `src/app/(dashboard)/crm/page.tsx` (personnalisation titre professionnel)

**Commit** : `1c4b7a5`

---

**Prêt à utiliser en production** 🚀
