# Diagnostique Nurturing — Tableau Actions/Fonctions/Outils

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │     Action     │        Fonctions Principales         │              Outils              │    Statut     │
│                 │                │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. Contact      │                │                                      │                                  │               │
│ Management (13  │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ Voir liste     │ loadContacts() → GET                 │ TanStack Query, Supabase fetch   │ ✅            │
│                 │ contacts       │ /api/nurturing/contacts              │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ Rechercher     │ useState debounced 300ms + filter    │ use-debounce,                    │ ✅            │
│                 │ contact        │                                      │ react-highlight-words            │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3               │ Filtrer par    │ filterTemp state + Array.filter      │ useState, calcul auto            │ ✅            │
│                 │ température    │                                      │ température                      │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4               │ Afficher       │ Toggle showArchived → recharge liste │ useState boolean                 │ ✅            │
│                 │ archivés       │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5               │ Sélectionner   │ setSelectedContactIdx → charge       │ useState + loadContactDetails()  │ ✅            │
│                 │ contact        │ détail                               │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6               │ Menu           │ Clic droit → dropdown actions        │ @radix-ui/react-dropdown-menu    │ ✅            │
│                 │ contextuel     │ rapides                              │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7               │ Créer nouveau  │ Modal formulaire → POST              │ @radix-ui/react-dialog,          │ ✅            │
│                 │ contact        │ /api/nurturing/contacts              │ react-hook-form, zod             │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 8               │ Éditer         │ Formulaire config + PATCH            │ react-hook-form, useState        │ ✅            │
│                 │ informations   │ /api/nurturing/contacts              │                                  │ Opérationnel  │
│                 │ contact        │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 9               │ Archiver       │ PATCH                                │ Supabase update                  │ ✅            │
│                 │ contact        │ /api/nurturing/contacts/archive      │ nurturing_archived=true          │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 10              │ Désarchiver    │ PATCH                                │ Supabase update                  │ ✅            │
│                 │ contact        │ /api/nurturing/contacts/archive      │                                  │ Opérationnel  │
│                 │                │ (false)                              │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 11              │ Supprimer      │ DELETE                               │ Supabase hard delete             │ ✅            │
│                 │ contact        │ /api/nurturing/contacts/delete +     │                                  │ Opérationnel  │
│                 │                │ confirm                              │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 12              │ Exporter       │ GET /api/nurturing/contacts/export   │ papaparse (CSV), 14 colonnes     │ ✅            │
│                 │ contacts       │ → CSV UTF-8 avec BOM                 │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 13              │ Importer       │ POST /api/nurturing/contacts/import  │ papaparse, validation email/tel, │ ✅            │
│                 │ contacts       │ → mapping auto + détection doublons  │ détection doublons               │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2. Message      │                │                                      │                                  │               │
│ Sending (10     │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 14              │ Composer       │ Textarea + variable picker {Prénom}  │ useState, MessageComposer        │ ✅            │
│                 │ message        │                                      │ component                        │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 15              │ Sélectionner   │ Dropdown                             │ useState selectedChannel         │ ✅            │
│                 │ canal          │ Email/WhatsApp/SMS/Call/LinkedIn     │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 16              │ Choisir        │ GET /api/nurturing/messages + select │ Bibliothèque templates DB        │ ✅            │
│                 │ template       │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 17              │ Interpoler     │ interpolateTemplate() →              │ handlebars v4.7.9,               │ ✅            │
│                 │ variables      │ Handlebars.compile()                 │ prepareContactData()             │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 18              │ Joindre        │ Upload → Supabase Storage            │ Supabase Storage, react-dropzone │ ⚠️            │
│                 │ document       │                                      │                                  │ UI présent,   │
│                 │                │                                      │                                  │ backend à     │
│                 │                │                                      │                                  │ brancher      │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 19              │ Programmer     │ Date picker + time picker →          │ react-day-picker@9,              │ ✅            │
│                 │ envoi          │ scheduled_messages table             │ react-time-picker, date-fns-tz   │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 20              │ Envoyer        │ POST /api/nurturing/send-message →   │ Brevo API v3 (email/SMS),        │ ✅            │
│                 │ immédiatement  │ sendBrevoEmail() / sendBrevoSms()    │ fetch natif                      │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 21              │ Prévisualiser  │ Modal Radix UI avec variables        │ @radix-ui/react-dialog,          │ ✅            │
│                 │ message        │ interpolées en temps réel            │ interpolateTemplate()            │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 22              │ Sauvegarder    │ Autosave 1000ms → table              │ use-debounce, Supabase           │ ✅            │
│                 │ brouillon      │ message_drafts (upsert)              │ message_drafts table             │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 23              │ Historique     │ Timeline messages envoyés par canal  │ GET /api/nurturing/interactions  │ ✅            │
│                 │ envois         │ dans tab Historique                  │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3. Sequence     │                │                                      │                                  │               │
│ Management (8   │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 24              │ Voir séquences │ GET sequence_instance_steps          │ Supabase query builder           │ ✅            │
│                 │ actives        │ Supabase                             │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 25              │ Créer nouvelle │ Modal 3 étapes → POST templates +    │ SequencePanel component          │ ✅            │
│                 │ séquence       │ steps                                │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 26              │ Éditer         │ Bouton "✏️ Éditer" + PATCH           │ Formulaire pré-rempli,           │ ✅            │
│                 │ séquence       │ template/steps                       │ DELETE/POST steps                │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 27              │ Assigner       │ POST /api/crm/sequences/start        │ Dropdown séquences + bouton      │ ✅            │
│                 │ séquence       │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 28              │ Pause séquence │ PATCH /api/crm/sequences/:id →       │ Bouton ⏸️, status='paused'      │ ✅            │
│                 │                │ action='pause'                       │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 29              │ Reprendre      │ PATCH /api/crm/sequences/:id →       │ Bouton ▶️, status='active'      │ ✅            │
│                 │ séquence       │ action='resume'                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 30              │ Arrêter        │ PATCH action='cancel' →              │ Bouton ⏹️ + confirmation,       │ ✅            │
│                 │ séquence       │ status='cancelled' + skip steps      │ status='cancelled'               │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 31              │ Dupliquer      │ POST /api/crm/sequences/templates/   │ Bouton 📋, copie avec "(Copie)"  │ ✅            │
│                 │ séquence       │ :id/duplicate                        │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4. Interaction  │                │                                      │                                  │               │
│ History (5      │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 32              │ Voir timeline  │ Liste chronologique interactions     │ GET /api/nurturing/interactions  │ ✅            │
│                 │                │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 33              │ Filtrer par    │ Checkbox multi-select +              │ @radix-ui/react-checkbox,        │ ✅            │
│                 │ type           │ state historyTypeFilters             │ Array.filter()                   │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 34              │ Filtrer par    │ Date range picker (input date) +     │ <input type="date">,             │ ✅            │
│                 │ période        │ state historyDateRange               │ useState                         │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 35              │ Ajouter        │ Boutons quick log (📞📧💬) →         │ POST /api/nurturing/interactions │ ✅            │
│                 │ interaction    │ POST interactions                    │                                  │ Opérationnel  │
│                 │ manuelle       │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 36              │ Exporter       │ GET /api/nurturing/interactions/     │ papaparse (CSV), filtres types + │ ✅            │
│                 │ historique     │ export → CSV UTF-8 avec BOM          │ dates                            │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5. Temperature  │                │                                      │                                  │               │
│ & Scoring (4    │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 37              │ Voir score     │ Badge visuel (🔥/⚡/❄️/💀) + icône  │ calculateTempCategory() fonction │ ✅            │
│                 │ température    │ 🔒 si forcé                          │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 38              │ Ajuster        │ Dropdown forcer température          │ @radix-ui/react-select,          │ ✅            │
│                 │ manuellement   │ (Auto/Chaud/Tiède/Froid/Dead)        │ colonne forced_temperature       │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 39              │ Voir calcul    │ Tooltip Radix UI avec formule        │ @radix-ui/react-tooltip v1.2.16, │ ✅            │
│                 │ auto           │ complète (+1 inter, +3 RDV,          │ message si forcé                 │ Opérationnel  │
│                 │                │ -1/semaine)                          │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 40              │ Voir score     │ Badge coloré (✓ Normale / ⚡ Varier │ computePressure() fonction       │ ✅            │
│                 │ pression       │ / 🛑 STOP) dans Config               │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6.              │                │                                      │                                  │               │
│ Configuration   │                │                                      │                                  │               │
│ Contact (4      │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 41              │ Définir        │ Select nombre messages/semaine       │ ContactDetail config panel,      │ ✅            │
│                 │ fréquence      │                                      │ contact_frequency_days           │ Opérationnel  │
│                 │ maximale       │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 42              │ Exclure canaux │ Boutons cliquables (tel/email/wa/    │ ContactDetail config panel,      │ ✅            │
│                 │                │ li/courrier/sms) → excluded_channels │ excluded_channels array          │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 43              │ Définir        │ Select timezone (9 zones) →          │ @radix-ui/react-select,          │ ✅            │
│                 │ timezone       │ fromZonedTime() pour schedulés       │ date-fns-tz v3.2.0               │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 44              │ Thèmes de      │ Multi-select éditable + PUT          │ Boutons thèmes, PUT              │ ✅            │
│                 │ prospection    │ /api/nurturing/prospect-themes       │ /api/nurturing/prospect-themes   │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7. Analytics &  │                │                                      │                                  │               │
│ KPIs (3         │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 45              │ Voir KPIs      │ Barre 6 metrics (conversion, temps   │ GET /api/nurturing/kpis          │ ✅            │
│                 │ globaux        │ rép., pression, actifs, relances,    │                                  │ Opérationnel  │
│                 │                │ taux rép.)                           │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 46              │ Filtrer KPIs   │ Date range picker + GET              │ <input type="date">,             │ ✅            │
│                 │ par période    │ /api/nurturing/kpis?start_date&      │ kpisDateRange state              │ Opérationnel  │
│                 │                │ end_date                             │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 47              │ Exporter       │ PDF dashboard analytics              │ ❌ jsPDF à implémenter si besoin │ ❌ À faire    │
│                 │ rapport        │                                      │                                  │               │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## Résumé Exécutif

**Total : 47 actions** — **45 ✅ Opérationnel** / **1 ⚠️ Partiel** / **1 ❌ À faire**

**Taux de fonctionnalité : 96%**

### Par Catégorie

| Catégorie | Total | ✅ | ⚠️ | ❌ | Taux |
|-----------|-------|----|----|----|----|
| Contact Management | 13 | 13 | 0 | 0 | 100% |
| Message Sending | 10 | 9 | 1 | 0 | 90% |
| Sequence Management | 8 | 8 | 0 | 0 | 100% |
| Interaction History | 5 | 5 | 0 | 0 | 100% |
| Temperature & Scoring | 4 | 4 | 0 | 0 | 100% |
| Configuration Contact | 4 | 4 | 0 | 0 | 100% |
| Analytics & KPIs | 3 | 2 | 0 | 1 | 67% |

### Actions à Compléter

1. **#18 (⚠️)** : Joindre document — UI présent, brancher backend Supabase Storage
2. **#47 (❌)** : Exporter rapport PDF — Installer jsPDF si besoin futur
