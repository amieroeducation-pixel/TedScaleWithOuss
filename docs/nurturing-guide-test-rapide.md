# Guide Test Rapide - Module Nurturing (10 fonctionnalités)

**Pré-requis** : Serveur lancé sur http://localhost:3002 (commande : `npm run dev`)

---

## ✅ CHECKLIST TESTS (20 minutes)

### Test #1 : Export Rapport PDF (NOUVEAU ⭐)

**Où** : Page `/nurturing` en haut

**Actions** :
1. [ ] Clic bouton **"📥 Exporter PDF"** (cyan, à droite des date pickers)
2. [ ] Vérifier téléchargement automatique `rapport-nurturing-YYYY-MM-DD.pdf`
3. [ ] Ouvrir PDF → vérifier présence de :
   - [ ] Header "Dashboard Nurturing" avec date du jour
   - [ ] Section KPIs avec 6 métriques colorées
   - [ ] Tableau "Top 5 Contacts" avec noms + emoji température
   - [ ] Tableau "Performance par Canal" avec taux réponse
   - [ ] Footer avec copyright + numéro page

**Résultat attendu** : PDF téléchargé, 3 sections présentes, style PSG Cosmos (gold/dark)

---

### Test #2 : Export PDF avec Filtrage Date

**Où** : Page `/nurturing` en haut

**Actions** :
1. [ ] Sélectionner **date début** : 01/07/2026
2. [ ] Sélectionner **date fin** : 31/07/2026
3. [ ] Attendre 1-2 secondes (KPIs se recalculent)
4. [ ] Clic **"📥 Exporter PDF"**
5. [ ] Ouvrir PDF → vérifier header affiche **"Période : 01/07/2026 → 31/07/2026"**

**Résultat attendu** : PDF avec période filtrée dans header

---

### Test #3 : Pause Séquence

**Où** : Page `/nurturing` → onglet contact avec séquence active

**Actions** :
1. [ ] Sélectionner un contact avec badge "Séquence active"
2. [ ] Panneau affiche "▶ Séquence active" avec liste d'étapes
3. [ ] Clic bouton **"⏸️"** (pause, en haut à droite du panneau)
4. [ ] Vérifier badge change en **"⏸️ En pause"** (orange)
5. [ ] Vérifier bouton pause remplacé par bouton **"▶️"** (reprendre, vert)

**Résultat attendu** : Séquence en pause, bouton reprendre visible

---

### Test #4 : Reprendre Séquence

**Où** : Page `/nurturing` → contact avec séquence en pause (suite test #3)

**Actions** :
1. [ ] Clic bouton **"▶️"** (reprendre, vert)
2. [ ] Vérifier badge redevient **"▶ Séquence active"** (vert)
3. [ ] Vérifier bouton reprendre remplacé par bouton **"⏸️"** (pause)

**Résultat attendu** : Séquence active, bouton pause visible

---

### Test #5 : Arrêter Séquence

**Où** : Page `/nurturing` → contact avec séquence active

**Actions** :
1. [ ] Clic bouton **"⏹️"** (arrêter, rouge, à droite du bouton pause)
2. [ ] Popup confirmation : **"Voulez-vous vraiment arrêter définitivement cette séquence ?"**
3. [ ] Clic **"OK"**
4. [ ] Vérifier panneau séquence disparaît
5. [ ] Vérifier affichage **"Aucune séquence active"**

**Résultat attendu** : Séquence supprimée, panneau vide

---

### Test #6 : Dupliquer Séquence

**Où** : Page `/nurturing` → panneau séquence contact (ou `/settings?tab=sequences`)

**Actions** :
1. [ ] Contact sans séquence → clic **"⚡ Lancer une séquence"**
2. [ ] Dans liste séquences → clic **"⚙️ Voir"** sur une séquence
3. [ ] Vue détail séquence avec steps
4. [ ] Clic bouton **"📋 Dupliquer"** (en bas à droite)
5. [ ] Vérifier toast : **"Séquence dupliquée avec succès"**
6. [ ] Retour liste → vérifier nouvelle séquence **"Nom Original (Copie)"**

**Résultat attendu** : Nouvelle séquence créée avec "(Copie)" dans nom

---

### Test #7 : Filtrer Historique par Type

**Où** : Page `/nurturing` → contact sélectionné → **onglet "Historique"**

**Actions** :
1. [ ] Section **"Filtrer par type"** avec 5 checkboxes
2. [ ] Cocher **"Email"** uniquement
3. [ ] Vérifier timeline affiche UNIQUEMENT interactions email
4. [ ] Cocher en plus **"WhatsApp"**
5. [ ] Vérifier timeline affiche email + WhatsApp
6. [ ] Clic **"✕ Effacer filtres"**
7. [ ] Vérifier toutes interactions réapparaissent

**Résultat attendu** : Filtrage temps réel, bouton reset fonctionne

---

### Test #8 : Filtrer Historique par Période

**Où** : Page `/nurturing` → onglet "Historique"

**Actions** :
1. [ ] Section **"Filtrer par période"**
2. [ ] Champ **"Du"** → sélectionner 01/07/2026
3. [ ] Champ **"Au"** → sélectionner 31/07/2026
4. [ ] Vérifier timeline affiche uniquement interactions juillet 2026
5. [ ] Clic **"✕ Effacer"**
6. [ ] Vérifier toutes interactions réapparaissent

**Résultat attendu** : Filtrage date précis, reset fonctionne

---

### Test #9 : Exporter Historique CSV

**Où** : Page `/nurturing` → onglet "Historique"

**Actions** :
1. [ ] Optionnel : appliquer filtres type + période
2. [ ] Clic bouton **"📥 Exporter CSV"** (cyan, en bas filtres)
3. [ ] Vérifier nouvel onglet s'ouvre
4. [ ] Vérifier téléchargement `historique-interactions-{ID}-{timestamp}.csv`
5. [ ] Ouvrir CSV dans Excel → vérifier colonnes :
   - [ ] Date
   - [ ] Type
   - [ ] Canal
   - [ ] Note
   - [ ] Statut

**Résultat attendu** : CSV téléchargé, encodage UTF-8 correct, colonnes présentes

---

### Test #10 : Ajuster Température Manuellement

**Où** : Page `/nurturing` → contact sélectionné → **onglet "Config"**

**Actions** :
1. [ ] Section **"Forcer température"** → dropdown 5 options
2. [ ] Actuellement : **"⚙️ Auto (calcul normal)"**
3. [ ] Sélectionner **"🔥 Forcer Chaud"**
4. [ ] Clic **"Sauvegarder configuration"** (bouton bleu en bas)
5. [ ] Retour **onglet "Séquence & Messages"**
6. [ ] Vérifier badge température affiche **🔥** avec icône **🔒** (petit cadenas en haut à droite du badge)
7. [ ] Hover sur badge → tooltip affiche : **"Température forcée manuellement — le calcul automatique est désactivé"**

**Résultat attendu** : Badge température forcé 🔥, icône 🔒 visible, tooltip explicatif

---

### Test #11 : Filtrer KPIs par Période

**Où** : Page `/nurturing` en haut (barre KPIs)

**Actions** :
1. [ ] Section **"Période KPIs:"** → 2 date pickers
2. [ ] Noter valeur actuelle **"Conversion"** (ex: 23%)
3. [ ] Sélectionner date début : 01/06/2026
4. [ ] Sélectionner date fin : 30/06/2026
5. [ ] Attendre 1-2 secondes (recalcul automatique)
6. [ ] Vérifier barre KPIs mise à jour (valeurs différentes)
7. [ ] Clic **"✕ Tout afficher"**
8. [ ] Vérifier KPIs reviennent aux valeurs initiales

**Résultat attendu** : KPIs recalculés automatiquement, reset fonctionne

---

## 🐛 SI UN BUG EST DÉTECTÉ

**Noter dans un fichier texte** :

```
BUG #X : [Titre court]

SCÉNARIO :
- Étape 1 : ...
- Étape 2 : ...
- Étape 3 : [BUG se produit ici]

ATTENDU : ...

RÉEL : ...

CONSOLE NAVIGATEUR (F12) :
[copier erreurs rouges]

CONSOLE SERVEUR :
[copier erreurs dans terminal npm run dev]

SCREENSHOT : [prendre capture écran]
```

---

## 📊 RÉSUMÉ RAPIDE

**Temps estimé** : 20 minutes pour tester les 11 points

**Si tout passe** :
- ✅ Module Nurturing 100% opérationnel
- ✅ Prêt pour utilisation production
- ✅ Documentation complète dans `docs/`

**Si bugs détectés** :
- Noter bugs avec template ci-dessus
- Reporter dans fichier `docs/bugs-nurturing-2026-08-11.md`
- Agent corrigera lors prochaine session

---

## 🎯 FOCUS PRIORITAIRE

**Les 3 tests les plus importants** (si manque de temps) :

1. **Test #1** : Export PDF (nouvelle feature)
2. **Test #3-4-5** : Pause/Reprendre/Arrêter séquence (fonctionnalités critiques)
3. **Test #10** : Forcer température (impact UX important)

Les autres tests (filtres) sont moins critiques car ils impactent uniquement l'affichage.

---

Bon test Ted ! 🚀
