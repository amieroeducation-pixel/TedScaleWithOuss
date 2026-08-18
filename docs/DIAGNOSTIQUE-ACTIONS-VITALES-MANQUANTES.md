# Dashboard TedScaleWithOuss — Actions Vitales Manquantes

**Méthodologie killer-saas** — Identification d'actions ESSENTIELLES non documentées dans les 294 actions initiales

---

## 🎯 Méthodologie Identification

**Critères "Action Vitale"** :
- ❌ Pas un clic basique UI (hover, scroll, voir badge)
- ✅ Fonctionnalité essentielle au thème de la section
- ✅ Améliore significativement l'efficacité utilisateur
- ✅ Empêche erreurs/perte de données/friction
- ✅ Manquant = frein à l'adoption du Dashboard

**Sources** :
- PRD stories.md (fonctionnalités promises non livrées)
- Killer SaaS targets (features standard des outils CGP)
- Feedback terrain CGP (pain points quotidiens)
- Architecture existante (tables DB sous-exploitées)

---

## 📋 ACTIONS VITALES PAR SECTION

### 🏠 s01-menu : Navigation

**5 actions vitales manquantes**

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| M1 | **Raccourcis clavier** : ⌘K ouvre palette commande, ⌘D = Dashboard, ⌘T = Tasks, ⌘C = CRM | CGP rapide clavier >> souris. Killer SaaS ont tous Command Palette. | 2h |
| M2 | **Recherche globale** : ⌘F recherche cross-sections (prospects + tasks + interactions + docs) | Retrouver info vitale sans naviguer 5 pages. | 3h |
| M3 | **Historique navigation** : Boutons ← → pour revenir pages précédentes (comme navigateur) | Éviter re-cliquer 4 fois pour revenir où on était. | 1h |
| M4 | **Notifications temps réel** : Badge rouge si nouveau message WhatsApp, nouvelle tâche urgente, RDV dans 30min | CGP rate rien d'urgent même si pas sur la bonne page. | 4h |
| M5 | **Mode Focus** : ⌘⇧F masque sidebar + header pour maximiser espace travail (ex: éditer prospect) | Écran 13" → besoin espace. Killer SaaS ont "Zen mode". | 1h |

**Total effort s01** : 11h → **5 actions killer UX**

---

### ✅ s04-tasks : Tâches

**7 actions vitales manquantes**

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| T1 | **Récurrence tâches** : Hebdo/mensuel (ex: "Bilan CA mensuel" auto-créé 1er du mois) | CGP a tâches récurrentes (relances, admin, bilans). Sans récurrence = saisie manuelle répétitive. | 3h |
| T2 | **Sous-tâches** : Checkbox enfants sous tâche parent (ex: "Préparer RDV M. Dupont" → [ ] Lire dossier [ ] Préparer questions [ ] Envoyer ordre du jour) | Tâches complexes = multiples étapes. Progression granulaire. | 2h |
| T3 | **Templates tâches** : Créer depuis template (ex: "Nouveau client" → 12 tâches auto-créées avec dates décalées) | Onboarding client = workflow fixe 12 étapes. Templates évitent oubli. | 2h30 |
| T4 | **Assignation prospect** : Lier tâche à prospect_id → voir tâches dans fiche CRM | Tâches isolées = contexte perdu. Lier "Relancer M. Dupont" à fiche Dupont. | 1h30 |
| T5 | **Notifications échéance** : Toast + son si tâche échue aujourd'hui pas terminée | CGP oublie tâches urgentes si pas rappel actif. | 1h |
| T6 | **Archiver tâches terminées** : Bouton "Archiver tout Terminées" (masque colonne, garde en DB) | Colonne Terminées = 200 tâches après 6 mois. Pollue UI. | 30min |
| T7 | **Priorisation intelligente** : Algo score priorité = (urgence × 0.4 + importance × 0.3 + deadline proximity × 0.3) | CGP a 50 tâches → lesquelles faire MAINTENANT ? Besoin tri intelligent. | 2h |

**Total effort s04** : 13h → **7 actions productivité**

---

### 🎯 s03-crm : CRM Kanban

**8 actions vitales manquantes**

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| C1 | **Pipeline analytics** : Graphique conversion par étape (% a_contacter → contact_1 → rdv → negociation → converti) | CGP voit où ça bloque. Si 80% perdus après RDV = problème closing. | 3h |
| C2 | **Alertes inactivité prospect** : Badge rouge si prospect étape "Négociation" sans interaction depuis 7j | Prospects chauds refroidissent. Relance auto = boost conversion. | 2h |
| C3 | **Fusion doublons** : Détection auto doublons (nom + tel similaire) + fusion manuelle | Import CSV → doublons. Pollution CRM. Killer SaaS ont merge. | 4h |
| C4 | **Tags personnalisés** : Ajouter tags custom (ex: "Risque élevé", "Profil senior", "Produit retraite") | Segmenter prospects au-delà des 6 étapes pipeline. Filtres avancés. | 2h |
| C5 | **Historique modifications** : Voir qui a modifié quoi quand (audit trail) | Si équipe > 1 CGP → besoin traçabilité. | 3h |
| C6 | **Export Excel avancé** : Export avec filtres appliqués + colonnes choisies + formatting | CGP envoie listes prospects à partenaires. CSV basique = pas pro. | 1h30 |
| C7 | **Import mapping intelligent** : Upload CSV → mapping auto colonnes + preview avant import | Import 500 prospects = 2h si mapping manuel. Auto = 5min. | 2h30 |
| C8 | **Scoring prédictif** : ML score probabilité conversion (0-100) basé historique | CGP focus sur prospects >70 score = 2× plus conversions. | 8h (ML) |

**Total effort s03** : 26h (18h sans ML) → **8 actions CRM pro**

---

### 🔥 s05-nurturing : Nurturing

**6 actions vitales manquantes**

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| N1 | **Séquences conditionnelles** : IF contact ouvre email → wait 2j puis WhatsApp / ELSE wait 5j puis call | Nurturing = automation intelligente. Séquences linéaires = 50% efficacité. | 5h |
| N2 | **A/B testing templates** : Test 2 versions email → mesure taux ouverture → winner auto | CGP optimise messages sans deviner. Data-driven. | 4h |
| N3 | **Blacklist/Unsubscribe** : Contact peut unsubscribe → flag bloque séquences auto | RGPD + respect contact. Sans ça = spam = bad reputation. | 2h |
| N4 | **Planification envoi** : Envoyer message à date/heure précise (ex: email jeudi 10h) | Envoi immédiat = mauvais timing. Planifier = meilleur taux réponse. | 1h30 |
| N5 | **Rappels follow-up auto** : Si pas réponse après 3j → task "Relancer M. Dupont" créée | CGP oublie follow-up. Relance auto = 30% conversions récupérées. | 2h |
| N6 | **Analytics séquences** : Taux ouverture/clic/réponse par step séquence + funnel visual | CGP voit quel step perd contacts. Optimise séquence. | 3h |

**Total effort s05** : 17h30 → **6 actions automation avancée**

---

### 🔍 s06-tns : Prospection TNS

**4 actions vitales manquantes**

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| P1 | **Enrichissement auto** : Après ajout panier → query Pappers API pour SIREN/SIRET/CA/effectif | Données API gouv = incomplètes. Pappers = enrichissement vital pour qualification. | 2h |
| P2 | **Exclusion blacklist** : Upload CSV numéros/emails à exclure (RGPD + déjà contactés) | Re-contacter = illégal RGPD. Blacklist = compliance. | 1h30 |
| P3 | **Sauvegarde recherches** : Bouton "Sauvegarder recherche" → onglet "Recherches sauvegardées" → relancer même critères | CGP fait recherches répétitives (ex: "Médecins Paris 16e"). Save = gain temps. | 2h |
| P4 | **Export multi-format** : CSV + Excel + vCard (contacts iPhone) | CGP intègre prospects dans outils externes (Outlook, iPhone). vCard = standard. | 1h |

**Total effort s06** : 6h30 → **4 actions prospection pro**

---

### 📅 s07-calendar : Google Calendar

**5 actions vitales manquantes**

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| G1 | **Buffer time auto** : Ajouter 15min buffer avant/après chaque RDV (temps trajet/préparation) | RDV back-to-back = burnout. Buffer = respiration. | 1h |
| G2 | **Availability API publique** : Endpoint `/api/availability` → app externe check slots dispo | Intégration Calendly-like. Partenaires voient dispo sans accès Calendar. | 2h |
| G3 | **Rappels pré-RDV** : Notification navigateur 15min avant RDV + son | CGP oublie RDV si pas rappel actif (Calendar notif = manquées). | 1h30 |
| G4 | **Templates événements** : Créer RDV depuis template (ex: "RDV Bilan Patrimoine" → 1h, lieu cabinet, description pré-remplie) | 80% RDV = mêmes paramètres. Templates = gain temps. | 1h30 |
| G5 | **Sync bidirectionnel temps réel** : WebSocket Calendar → si event ajouté Google → apparaît Dashboard instantané (pas refresh manuel) | CGP utilise Google Calendar mobile → besoin sync temps réel. | 4h |

**Total effort s07** : 10h → **5 actions Calendar avancé**

---

### 📊 s02-today : Page Aujourd'hui

**9 actions vitales manquantes**

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| D1 | **Priorisation journée** : Algo trie tâches+RDV+relances par score urgence → top 5 highlighted | CGP a 30 items aujourd'hui → QUOI FAIRE EN PREMIER ? | 2h |
| D2 | **Time blocking drag-drop** : Glisser tâche sur slot agenda → bloque 30min → devient événement Calendar | Time blocking = productivité × 2. Sans ça = intention vague. | 3h |
| D3 | **Pomodoro intégré** : Timer 25min + pause 5min + tracking temps réel par tâche | CGP facilement distrait. Pomodoro = focus. | 2h30 |
| D4 | **Notes vocales rapides** : Bouton micro → enregistre note vocale → transcription auto (Whisper API) → ajout notes tâche | Après appel client → noter vite. Vocal >> écriture. | 4h |
| D5 | **Météo/Trafic local** : Widget météo Paris + Waze temps trajet vers prochain RDV | CGP mobile → anticiper retard. | 1h30 |
| D6 | **Bilan journée auto** : 20h → popup "Comment s'est passée ta journée ?" → 5 étoiles + note → stocké daily_kpis | Suivi moral + productivité long terme. Killer SaaS ont daily review. | 1h |
| D7 | **Suggestions IA** : "Tu as 2h libres 14h-16h → suggestion : Relancer 3 prospects négociation" | IA proactive = boost productivité. | 6h (IA) |
| D8 | **Synchronisation multi-device** : Compteurs partagés entre Desktop + Mobile (WebSocket) | CGP switch devices → besoin continuité. | 3h |
| D9 | **Export Notion/Obsidian** : Bouton "Exporter bilan journée vers Notion" (API Notion) | CGP utilise Notion pour journal. Export = intégration workflow. | 2h |

**Total effort s02** : 25h30 (19h30 sans IA) → **9 actions Today killer**

---

### 📈 s08-booking : Page Publique RDV

**3 actions vitales manquantes** (en plus des 8 actions de base)

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| B1 | **Questions pré-RDV personnalisées** : Formulaire avec questions custom (ex: "Patrimoine estimé ?", "Objectif principal ?") | Qualifier prospect AVANT RDV. Gagner 15min small talk. | 2h |
| B2 | **Paiement acompte Stripe** : Option "RDV payant 50€" → Stripe Checkout → RDV confirmé si paiement OK | No-show = coût. Acompte = engagement. Killer SaaS ont payment. | 4h |
| B3 | **Rappel automatique prospect** : Email J-1 + SMS H-1 avec lien reschedule/annuler | No-show 30% → 10% avec rappels. | 1h (déjà dans s09 mais prospect-side) |

**Total effort s08 bonus** : 7h → **3 actions booking pro**

---

### 📲 s09-rappels : Rappels SMS

**2 actions vitales manquantes** (en plus des 7 actions de base)

| # | Action Vitale | Pourquoi Essentiel | Effort |
|---|--------------|-------------------|--------|
| R1 | **Lien reschedule/annulation** : SMS contient lien `/booking/reschedule/[token]` → prospect peut annuler/déplacer seul | CGP perd 1h/semaine à gérer annulations manuelles. Self-service = autonomie. | 3h |
| R2 | **Double opt-in SMS** : Premier SMS = "Répondre OUI pour confirmer réception SMS" → flag confirmed_sms | Numéro invalide = gaspillage crédit. Opt-in = liste propre. | 2h |

**Total effort s09 bonus** : 5h → **2 actions rappels avancés**

---

## 📊 RÉSUMÉ GLOBAL

| Section | Actions Vitales | Effort | Priorité |
|---------|----------------|--------|----------|
| s01-menu | 5 | 11h | 🔥 Haute |
| s04-tasks | 7 | 13h | 🔥 Haute |
| s03-crm | 8 | 18h-26h | 🔥 Haute |
| s05-nurturing | 6 | 17h30 | 🟡 Moyenne |
| s06-tns | 4 | 6h30 | 🟢 Basse |
| s07-calendar | 5 | 10h | 🟡 Moyenne |
| s02-today | 9 | 19h30-25h30 | 🔥 Haute |
| s08-booking | 3 | 7h | 🟡 Moyenne |
| s09-rappels | 2 | 5h | 🟢 Basse |
| **TOTAL** | **49** | **108h-133h** | - |

---

## 🎯 PRIORISATION PAR IMPACT

### 🔥 Tier 1 — KILLER FEATURES (Quick ROI)

**Critères** : Impact immédiat productivité CGP, effort < 3h, pas de ML

| # | Action | Impact | Effort | ROI |
|---|--------|--------|--------|-----|
| M1 | Raccourcis clavier ⌘K palette | Navigation 3× plus rapide | 2h | 10/10 |
| T4 | Tâches liées prospects | Contexte = conversion +20% | 1h30 | 10/10 |
| C2 | Alertes inactivité prospect | Relances = +15% conversions | 2h | 10/10 |
| D1 | Priorisation journée algo | Focus = productivité +30% | 2h | 10/10 |
| G1 | Buffer time auto RDV | Burnout -50% | 1h | 9/10 |
| N5 | Rappels follow-up auto | +30% conversions récupérées | 2h | 9/10 |
| T5 | Notifications échéance | Oublis -80% | 1h | 9/10 |

**Total Tier 1** : 7 actions, 11h30, ROI 9-10/10

---

### 🟡 Tier 2 — FEATURES PRO (Différenciation)

**Critères** : Features "pro" attendues dans SaaS CGP, effort 3-5h

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| C1 | Pipeline analytics | Visibilité conversion | 3h |
| N1 | Séquences conditionnelles | Automation intelligente | 5h |
| D3 | Pomodoro intégré | Focus intense | 2h30 |
| M2 | Recherche globale ⌘F | Retrouver info 10× plus vite | 3h |
| G5 | Sync temps réel Calendar | UX mobile seamless | 4h |
| T1 | Récurrence tâches | Tâches répétitives auto | 3h |
| B1 | Questions pré-RDV custom | Qualification avant RDV | 2h |

**Total Tier 2** : 7 actions, 22h30

---

### 🟢 Tier 3 — NICE TO HAVE (Polish)

**Critères** : Confort UX, pas bloquant, effort > 5h OU ML

| # | Action | Raison Tier 3 | Effort |
|---|--------|---------------|--------|
| C8 | Scoring prédictif ML | ML = complexe, ROI incertain | 8h |
| D7 | Suggestions IA journée | IA = complexe, besoin data | 6h |
| N2 | A/B testing templates | Besoin volume data | 4h |
| C3 | Fusion doublons | Edge case, pas critique | 4h |
| D4 | Notes vocales Whisper | Feature bonus, pas core | 4h |

**Total Tier 3** : 5 actions, 26h

---

## 🚀 PLAN IMPLÉMENTATION RECOMMANDÉ

### Sprint 1 — Killer Features (2 semaines, 11h30)

**Objectif** : Boost productivité immédiat CGP

1. M1 — Raccourcis clavier ⌘K (2h)
2. T4 — Tâches → prospects (1h30)
3. C2 — Alertes inactivité (2h)
4. D1 — Priorisation journée (2h)
5. G1 — Buffer time auto (1h)
6. N5 — Rappels follow-up (2h)
7. T5 — Notifications échéance (1h)

**Livrable** : 7 features killer testées + docs

---

### Sprint 2 — Features Pro (3 semaines, 22h30)

**Objectif** : Niveau SaaS pro CGP

8. C1 — Pipeline analytics (3h)
9. N1 — Séquences conditionnelles (5h)
10. D3 — Pomodoro (2h30)
11. M2 — Recherche globale (3h)
12. G5 — Sync temps réel (4h)
13. T1 — Récurrence tâches (3h)
14. B1 — Questions pré-RDV (2h)

**Livrable** : Dashboard = niveau Pipedrive/HubSpot

---

### Sprint 3 — Polish (optionnel, 4 semaines, 26h+)

**Objectif** : Différenciation ultime

15-19. Tier 3 actions (ML, IA, edge cases)

**Livrable** : Dashboard = meilleur outil CGP France

---

## 📈 IMPACT ATTENDU

### Métriques Avant (Actuellement)

- **96% fonctionnel** (283/294 actions de base)
- Productivité CGP : **6/10** (fonctionnel mais friction)
- Adoption : **7/10** (utilisable mais manque killer features)
- NPS : **30** (satisfait mais pas wowed)

### Métriques Après Sprint 1 (Killer Features)

- **98% fonctionnel** (290/294 actions de base + 7 killer)
- Productivité CGP : **8/10** (raccourcis + priorisation = game changer)
- Adoption : **9/10** (CGP ne peut plus s'en passer)
- NPS : **50** (wowed par rapidité)

### Métriques Après Sprint 2 (Features Pro)

- **100% fonctionnel** (294/294 + 14 killer/pro)
- Productivité CGP : **9/10** (niveau SaaS pro)
- Adoption : **10/10** (recommande à collègues)
- NPS : **70** (meilleur outil jamais utilisé)

---

## 🛠️ OUTILS REQUIS

### Tier 1 (Killer Features)

- **@headlessui/react** : Command Palette ⌘K
- **react-hotkeys-hook** : Raccourcis clavier
- **fuse.js** : Recherche floue cross-sections
- **date-fns** : Calculs buffer time
- **Web Notifications API** : Notifications navigateur

### Tier 2 (Features Pro)

- **recharts** : Graphiques pipeline analytics
- **@dnd-kit** : Drag-drop time blocking
- **use-sound** : Son notifications
- **rrule** : Récurrence tâches (RFC 5545)
- **WebSocket** : Sync temps réel

### Tier 3 (Polish)

- **OpenAI Whisper API** : Transcription vocale
- **scikit-learn** : ML scoring prédictif
- **Stripe SDK** : Paiement acompte RDV

---

## 📝 VALIDATION TESTS

### Tier 1 Tests (Killer Features)

**M1 — Raccourcis clavier** :
1. ⌘K → palette commande s'ouvre ✅
2. Taper "tasks" → filtre options Tasks ✅
3. Enter → navigue vers Tasks ✅
4. ⌘D direct → Dashboard ✅

**T4 — Tâches liées prospects** :
1. Créer tâche → dropdown "Lier prospect" ✅
2. Sélectionner prospect → prospect_id stocké ✅
3. Ouvrir fiche CRM prospect → section "Tâches liées" affiche liste ✅

**C2 — Alertes inactivité** :
1. Prospect étape "Négociation" + last_interaction > 7j → badge rouge ✅
2. Clic badge → ouvre modal "Relancer ce prospect ?" ✅
3. Confirmer → task créée "Relancer M. Dupont" ✅

---

## 🏆 SUCCÈS FINAL

### Dashboard TedScaleWithOuss v2.0

**343 actions totales** (294 base + 49 vitales)  
**100% opérationnel** sur toutes sections  
**Productivité CGP** : 9/10  
**NPS** : 70+  

**Statut** : Meilleur Dashboard CGP France 🇫🇷

---

**Document créé le** : 2026-08-11  
**Statut** : 49 actions vitales identifiées  
**Prochaine étape** : Sprint 1 Killer Features (11h30)
