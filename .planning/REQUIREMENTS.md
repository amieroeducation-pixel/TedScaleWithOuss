# Requirements: Ted Scale With Ouss

**Defined:** 2026-05-10
**Core Value:** Avoir sur un seul écran tout ce qu'il faut faire aujourd'hui — relances prioritaires, alertes clients inactifs, CA en temps réel — sans aller chercher l'information ailleurs.

---

## v1 Requirements

### Data Wiring (pages réelles)

- [ ] **DATA-01**: L'utilisateur voit le CA mensuel réel vs objectif sur la page Revenue (depuis `v_monthly_revenue`)
- [ ] **DATA-02**: L'utilisateur voit l'évolution CA sur 12 mois en graphique linéaire (Recharts)
- [ ] **DATA-03**: L'utilisateur voit les commissions perçues par produit financier (BarChart)
- [ ] **DATA-04**: L'utilisateur voit la liste de ses clients actifs avec date dernière interaction
- [ ] **DATA-05**: L'utilisateur voit les alertes Client Health (clients sans contact depuis > seuil jours)
- [ ] **DATA-06**: L'utilisateur voit le Weekly Signal : relances prioritaires pour les 7 prochains jours
- [ ] **DATA-07**: L'utilisateur voit les RDV de la semaine (depuis Google Calendar ou table interactions)
- [ ] **DATA-08**: L'utilisateur voit les taux de conversion par étape pipeline (depuis `v_pipeline_conversion`)
- [ ] **DATA-09**: L'utilisateur voit le taux de closing global et par produit (PieChart)

### Séquences Multicanales

- [x] **SEQ-01**: L'utilisateur peut démarrer une séquence depuis le drawer d'une carte prospect (bouton "Démarrer séquence")
- [x] **SEQ-02**: Une séquence se déclenche automatiquement quand un prospect change de stade pipeline
- [x] **SEQ-03**: Une séquence peut envoyer un message WhatsApp Business à l'étape J+0
- [x] **SEQ-04**: Une séquence peut envoyer un email Brevo à une étape définie (J+X jours)
- [x] **SEQ-05**: Une séquence peut envoyer un SMS à une étape définie (Brevo SMS ou provider configurable)
- [x] **SEQ-06**: Une séquence peut créer un rappel appel interne (notification dans le dashboard)
- [x] **SEQ-07**: Une séquence peut ouvrir le profil LinkedIn + copier un template InMail
- [x] **SEQ-08**: L'utilisateur voit le statut de chaque étape de séquence (planifiée / envoyée / échouée)
- [x] **SEQ-09**: L'utilisateur peut mettre en pause ou annuler une séquence active
- [x] **SEQ-10**: Les séquences enregistrent chaque action dans la table `interactions`

### Configuration (Paramètres)

- [x] **CFG-01**: L'utilisateur peut configurer les séquences par stade pipeline (ajouter/modifier/supprimer étapes)
- [x] **CFG-02**: L'utilisateur peut définir les délais entre étapes (J+0, J+2, J+5...) par séquence
- [x] **CFG-03**: L'utilisateur peut choisir les canaux actifs par étape (WhatsApp / Email / SMS / Appel / LinkedIn)
- [x] **CFG-04**: L'utilisateur peut éditer les templates de messages par canal et par stade pipeline
- [x] **CFG-05**: L'utilisateur peut configurer quels changements de stade déclenchent une séquence automatique
- [x] **CFG-06**: L'utilisateur peut configurer les seuils d'alerte KPI (CA mensuel cible, CA annuel cible)
- [x] **CFG-07**: L'utilisateur peut configurer le seuil d'inactivité client par client (défaut 90 jours)
- [x] **CFG-08**: L'utilisateur peut activer/désactiver chaque trigger automatique individuellement
- [x] **CFG-09**: La configuration est persistée dans `user_settings` (Supabase) et chargée au démarrage

### Artefacts & Achievements

- [ ] **ACH-01**: L'utilisateur voit un badge + notification visuelle quand il atteint son objectif CA mensuel
- [ ] **ACH-02**: L'utilisateur voit un message de célébration avec animation (fire/confetti) quand l'objectif CA est atteint
- [ ] **ACH-03**: L'utilisateur voit un badge quand il atteint un seuil de clients actifs (ex : 10, 25, 50 clients)
- [ ] **ACH-04**: L'utilisateur peut consulter l'historique de ses objectifs atteints (timeline des succès)
- [ ] **ACH-05**: Les achievements sont persistés en BDD et ne se re-déclenchent pas après rechargement

### Automatisations (Edge Functions Cron)

- [ ] **AUTO-01**: Un rapport hebdomadaire est envoyé par email (Brevo) chaque lundi à 8h
- [ ] **AUTO-02**: Des alertes Client Health sont envoyées quotidiennement (email/SMS) pour les clients dépassant le seuil
- [ ] **AUTO-03**: Un rappel WhatsApp est envoyé automatiquement J-1 avant chaque RDV
- [ ] **AUTO-04**: Une alerte est envoyée si le CA mensuel est inférieur au seuil défini

---

## v2 Requirements

### Prospection

- **PROS-01**: Scraping TNS Île-de-France via Google Places API (sources, professions, départements)
- **PROS-02**: Import CSV/Excel prospects particuliers (react-dropzone + xlsx/PapaParse)
- **PROS-03**: Import prospects chefs d'entreprise (manuel ou CSV)
- **PROS-04**: Déduplication fuzzy prospects via `find_duplicate_prospects()` (pg_trgm)

### Google Calendar

- **CAL-01**: Sync bidirectionnel RDV avec Google Calendar (OAuth2)
- **CAL-02**: Création de RDV dans Google Calendar depuis le drawer prospect
- **CAL-03**: Affichage des RDV Google dans le Weekly Signal

### Import données existantes

- **IMP-01**: Import depuis Google Sheets (clients/prospects existants)
- **IMP-02**: Import CSV avec mapping colonnes et preview avant import

---

## Out of Scope

| Feature | Reason |
|---------|---------|
| Déploiement Vercel | Validé en local d'abord — phase ultérieure |
| Application mobile | Dashboard PC uniquement (Windows + Chrome) |
| Multi-utilisateurs / équipe | Usage solo CGP — pas de sharing de données |
| LinkedIn API officielle | Trop restrictive — bouton ouvre le profil manuellement |
| Enregistrement appels | Complexité légale (RGPD, consentement) |
| CRM complet (HubSpot-like) | Outil personnel, pas un CRM enterprise |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| DATA-06 | Phase 1 | Pending |
| DATA-07 | Phase 1 | Pending |
| DATA-08 | Phase 1 | Pending |
| DATA-09 | Phase 1 | Pending |
| SEQ-01 | Phase 2 | Complete |
| SEQ-02 | Phase 2 | Complete |
| SEQ-03 | Phase 2 | Complete |
| SEQ-04 | Phase 2 | Complete |
| SEQ-05 | Phase 2 | Complete |
| SEQ-06 | Phase 2 | Complete |
| SEQ-07 | Phase 2 | Complete |
| SEQ-08 | Phase 2 | Complete |
| SEQ-09 | Phase 2 | Complete |
| SEQ-10 | Phase 2 | Complete |
| CFG-01 | Phase 3 | Complete |
| CFG-02 | Phase 3 | Complete |
| CFG-03 | Phase 3 | Complete |
| CFG-04 | Phase 3 | Complete |
| CFG-05 | Phase 3 | Complete |
| CFG-06 | Phase 3 | Complete |
| CFG-07 | Phase 3 | Complete |
| CFG-08 | Phase 3 | Complete |
| CFG-09 | Phase 3 | Complete |
| ACH-01 | Phase 4 | Pending |
| ACH-02 | Phase 4 | Pending |
| ACH-03 | Phase 4 | Pending |
| ACH-04 | Phase 4 | Pending |
| ACH-05 | Phase 4 | Pending |
| AUTO-01 | Phase 5 | Pending |
| AUTO-02 | Phase 5 | Pending |
| AUTO-03 | Phase 5 | Pending |
| AUTO-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-10*
*Last updated: 2026-05-10 — traceability populated after roadmap creation*
