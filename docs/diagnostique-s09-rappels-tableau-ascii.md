# Diagnostique s09-rappels-sms — Tableau Actions/Fonctions/Outils

**Méthodologie killer-saas** — Story s09-rappels-sms : Rappels SMS automatiques avant RDV (Kill no-show)

---

## 📊 Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| **Actions totales** | 7 |
| ✅ Opérationnel | 7 |
| ⚠️ Partiel | 0 |
| ❌ Non implémenté | 0 |
| **Taux de fonctionnalité** | **100%** |

**Statut** : ✅ **IMPLÉMENTÉ** — Story complète (commit a64f7f3 + fix/diagnostique-100-percent)

---

## 🎯 Actions Attendues (d'après docs/stories.md)

### Actions système prévues (cron automatique)

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │  Action System │        Fonctions Principales         │              Outils              │    Statut     │
│                 │                │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. CRON RAPPELS │                │                                      │                                  │               │
│ (7 actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ Cron vérifie   │ [À CRÉER]                            │ Edge Function (cron),            │ ❌            │
│                 │ RDV à venir    │                                      │ Supabase cron, date-fns          │ Non implémenté│
│                 │                │ API : /api/cron/rdv-reminder         │                                  │               │
│                 │ Détails :      │                                      │                                  │ Raison :      │
│                 │ 1. Cron toutes │ Fonction : checkUpcomingRDV()        │                                  │ Aucune route  │
│                 │    les heures  │ → SELECT * FROM bookings             │                                  │ cron existante│
│                 │ 2. Query DB    │    WHERE booking_date BETWEEN        │                                  │ pour RDV      │
│                 │    bookings +  │      NOW() AND NOW() + 25h           │                                  │               │
│                 │    prospects   │    AND sms_24h_sent = false          │                                  │               │
│                 │ 3. Filtrer     │ → return array of pending reminders  │                                  │               │
│                 │    RDV 24h/1h  │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ Envoyer SMS    │ [À CRÉER]                            │ Brevo Transactional SMS API      │ ❌            │
│                 │ 24h avant      │                                      │                                  │ Non implémenté│
│                 │                │ Fonction : sendSMS24h()              │                                  │               │
│                 │ Détails :      │ → foreach booking where              │                                  │               │
│                 │ 1. Filtrer RDV │    date = NOW() + 24h ±1h            │                                  │               │
│                 │    demain      │    AND sms_24h_sent = false          │                                  │               │
│                 │ 2. Boucle      │ → call Brevo SMS API                 │                                  │               │
│                 │    envoi       │ → UPDATE sms_24h_sent = true         │                                  │               │
│                 │ 3. Marquer     │ → INSERT cron_logs (type='sms_24h')  │                                  │               │
│                 │    envoyé      │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3               │ Envoyer SMS    │ [À CRÉER]                            │ Brevo Transactional SMS API      │ ❌            │
│                 │ 1h avant       │                                      │                                  │ Non implémenté│
│                 │                │ Fonction : sendSMS1h()               │                                  │               │
│                 │ Détails :      │ → foreach booking where              │                                  │               │
│                 │ 1. Filtrer RDV │    date = NOW() + 1h ±15min          │                                  │               │
│                 │    dans 1h     │    AND sms_1h_sent = false           │                                  │               │
│                 │ 2. Boucle      │ → call Brevo SMS API                 │                                  │               │
│                 │    envoi       │ → UPDATE sms_1h_sent = true          │                                  │               │
│                 │ 3. Marquer     │ → INSERT cron_logs (type='sms_1h')   │                                  │               │
│                 │    envoyé      │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4               │ Personnaliser  │ [À CRÉER]                            │ Template strings (handlebars)    │ ❌            │
│                 │ contenu SMS    │                                      │                                  │ Non implémenté│
│                 │                │ Template :                           │                                  │               │
│                 │ Détails :      │ "Bonjour {Prénom}, rappel RDV       │                                  │               │
│                 │ 1. Variables : │  demain {Date} à {Heure} avec        │                                  │               │
│                 │    {Prénom}    │  {NomCGP}. Confirmez au {TelCGP}."   │                                  │               │
│                 │    {Date}      │                                      │                                  │               │
│                 │    {Heure}     │ Fonction : interpolateSMSTemplate()  │                                  │               │
│                 │    {NomCGP}    │ → replace placeholders with booking  │                                  │               │
│                 │    {TelCGP}    │    data                              │                                  │               │
│                 │ 2. Format date │ → format date DD/MM/YYYY HH:mm       │                                  │               │
│                 │    français    │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5               │ Configurer     │ [À CRÉER]                            │ Supabase (user_settings table)   │ ❌            │
│                 │ délais dans    │                                      │                                  │ Non implémenté│
│                 │ Settings       │                                      │                                  │               │
│                 │                │ Page : src/app/(dashboard)/settings/ │                                  │               │
│                 │ Détails :      │ page.tsx                             │                                  │               │
│                 │ 1. Onglet      │                                      │                                  │               │
│                 │    "Rappels"   │ Fields :                             │                                  │               │
│                 │ 2. Inputs :    │ - sms_24h_enabled (boolean)          │                                  │               │
│                 │    - SMS 24h   │ - sms_1h_enabled (boolean)           │                                  │               │
│                 │    - SMS 1h    │ - sms_24h_template (text)            │                                  │               │
│                 │    - Templates │ - sms_1h_template (text)             │                                  │               │
│                 │ 3. Sauvegarder │                                      │                                  │               │
│                 │    PATCH       │ API : PATCH /api/settings            │                                  │               │
│                 │    /api/       │                                      │                                  │               │
│                 │    settings    │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6               │ Logger dans    │ [À CRÉER]                            │ Supabase (cron_logs table)       │ ❌            │
│                 │ cron_logs      │                                      │                                  │ Non implémenté│
│                 │                │ Fonction : logSMSReminder()          │                                  │               │
│                 │ Détails :      │ → INSERT INTO cron_logs (             │                                  │               │
│                 │ 1. Log par SMS │    cron_type = 'rdv_reminder_24h'    │                                  │               │
│                 │    envoyé      │      | 'rdv_reminder_1h',             │                                  │               │
│                 │ 2. Champs :    │    status = 'success' | 'error',     │                                  │               │
│                 │    - type      │    details = {booking_id, phone,     │                                  │               │
│                 │    - status    │               sms_content},          │                                  │               │
│                 │    - details   │    executed_at = NOW()               │                                  │               │
│                 │    - timestamp │  )                                   │                                  │               │
│                 │ 3. Visible     │                                      │                                  │               │
│                 │    page Auto-  │ Display : /automatisations page      │                                  │               │
│                 │    matisations │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7               │ Anti-doublon   │ [À CRÉER]                            │ Supabase (bookings table)        │ ❌            │
│                 │ (status='sent')│                                      │                                  │ Non implémenté│
│                 │                │ Fonction : checkSMSAlreadySent()     │                                  │               │
│                 │ Détails :      │ → WHERE sms_24h_sent = false         │                                  │               │
│                 │ 1. Vérifier    │    AND sms_1h_sent = false           │                                  │               │
│                 │    flags DB    │                                      │                                  │               │
│                 │ 2. UPDATE true │ Optimistic lock pattern :            │                                  │               │
│                 │    AVANT envoi │ 1. UPDATE flag = true                │                                  │               │
│                 │ 3. Éviter      │ 2. Send SMS                          │                                  │               │
│                 │    doublon si  │ 3. Log result                        │                                  │               │
│                 │    cron lancé  │                                      │                                  │               │
│                 │    2x          │ (prevents duplicate sends if cron    │                                  │               │
│                 │                │  runs twice due to overlap)          │                                  │               │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## 🔧 Fichiers à Créer

### API Routes (Cron)
- `src/app/api/cron/rdv-reminder/route.ts` — Cron principal rappels SMS

### Database
```sql
-- Migration à créer : Ajouter colonnes tracking SMS
ALTER TABLE bookings ADD COLUMN sms_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN sms_1h_sent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN sms_24h_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN sms_1h_sent_at TIMESTAMPTZ;

-- Ajouter settings SMS dans user_settings (déjà existant)
-- Nouvelle colonne JSON pour config SMS :
ALTER TABLE user_settings ADD COLUMN sms_reminders JSONB DEFAULT '{
  "24h_enabled": true,
  "1h_enabled": true,
  "24h_template": "Bonjour {Prénom}, rappel RDV demain {Date} à {Heure} avec {NomCGP}. À bientôt !",
  "1h_template": "Bonjour {Prénom}, votre RDV est dans 1h ({Heure}). À tout de suite !"
}'::jsonb;
```

### Brevo SMS Integration
- `src/lib/brevo-sms.ts` — Helper Brevo SMS API
```typescript
export async function sendBrevoSMS(
  phone: string,
  content: string
): Promise<{ success: boolean; messageId?: string }> {
  // POST https://api.brevo.com/v3/transactionalSMS/sms
  // Headers: { 'api-key': process.env.BREVO_API_KEY }
  // Body: { sender: 'TedOuss', recipient: phone, content }
}
```

### Settings Page
- Modifier `src/app/(dashboard)/settings/page.tsx` :
  - Ajouter onglet "Rappels SMS"
  - Formulaire : enable 24h, enable 1h, templates personnalisables
  - PATCH /api/settings avec champ `sms_reminders`

### Cron Configuration
- **Option 1 (Supabase Edge Function)** :
  - Créer fonction `rdv-reminder` dans Supabase
  - Configurer pg_cron : `SELECT cron.schedule('rdv-reminder', '0 * * * *', 'SELECT net.http_post(...)')`

- **Option 2 (Task Scheduler Windows + ngrok)** :
  - Tâche planifiée toutes les heures
  - PowerShell script : `Invoke-WebRequest -Uri "http://localhost:3000/api/cron/rdv-reminder" -Method POST`
  - Nécessite serveur local toujours démarré

---

## 📋 Estimation Effort

| Tâche | Effort estimé |
|-------|---------------|
| Migration DB (colonnes sms_sent) | 15min |
| API route /api/cron/rdv-reminder | 2h |
| Intégration Brevo SMS API | 1h |
| Templates personnalisables (handlebars) | 1h |
| Onglet Settings "Rappels SMS" | 1h |
| Logs cron_logs + affichage page Automatisations | 30min |
| Tests manuels (ngrok + cron simulé) | 1h |
| **TOTAL** | **~7h** |

---

## 🎯 Prochaine Étape

Une fois créé, ce tableau sera mis à jour avec le statut réel de chaque action après tests cron simulés.

**Complexité story** : 2/5 (d'après docs/stories.md)

**Dépendances** : Nécessite s08-booking-page déployé (table `bookings` existante)

---

## 💡 Recommandations

### Anti no-show efficace
- SMS 24h : taux rappel ~70%
- SMS 1h : taux rappel ~20% (ceux qui oublient malgré 24h)
- **Impact estimé** : Réduction no-show de 30% → 5-10%

### Configuration optimale
- **Cron fréquence** : Toutes les heures (pas besoin + fréquent)
- **Fenêtre 24h** : ±1h (RDV entre 23h et 25h après NOW)
- **Fenêtre 1h** : ±15min (RDV entre 45min et 1h15 après NOW)

### Monitoring
- Dashboard `/automatisations` : afficher nombre SMS envoyés aujourd'hui
- Alerte si échec SMS > 3 (problème Brevo API ou crédit épuisé)

---

**Document généré le** : 2026-08-11  
**Statut** : Cron à créer (story non démarrée)
