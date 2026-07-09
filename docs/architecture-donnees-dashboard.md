# Architecture Données Dashboard PSG Cosmos

**Document créé le 05/07/2026**

Ce document répond à 3 questions critiques :
1. Quelles données stocker ?
2. Quelles données remonter à chaque ouverture ?
3. Comment les organiser pour des performances optimales ?

---

## 1. SCHÉMA EXISTANT (Synthèse)

### 1.1 Tables principales

```
prospects
├─ id, user_id, full_name, email, phone, phone_normalized
├─ profession, company, address, city, department
├─ pipeline_stage (enum: a_contacter → rdv1 → rdv2 → rdv3 → converti/perdu)
├─ status (enum: non_contacte, en_cours, converti, perdu)
├─ source (enum: tns, chefs_entreprise, particuliers, recommandation, linkedin, autre)
├─ lead_score (0-100)
├─ last_contact_at, next_action_date
├─ tags[], notes, linkedin_url
├─ signal_type, playbook_id, playbook_prospect_id
├─ created_at, updated_at

interactions
├─ id, user_id, prospect_id
├─ type (enum: appel, rdv1, rdv2, rdv3, email, whatsapp, linkedin, sms, autre)
├─ is_honored, occurred_at, calendar_event_id
├─ duration_min, notes, created_at

clients
├─ id, user_id, prospect_id (unique)
├─ total_aum (Assets Under Management)
├─ last_interaction_at, alert_threshold_days
├─ notes, created_at, updated_at

contracts
├─ id, user_id, client_id, product_id
├─ commission_amount, commission_status, commission_date
├─ signed_at, notes, created_at, updated_at

daily_kpis
├─ id, user_id, date (unique per user)
├─ contacts, calls, rdv1, rdv2, blocks
├─ created_at, updated_at

tasks
├─ id, user_id, title, description
├─ priority (1-4), col (todo/inprogress/waiting/blocked/done)
├─ estimated_time, badge (relance/agenda/autre)
├─ urgency (urgent/normal), this_week
├─ created_at, updated_at

sequence_instances
├─ id, user_id, prospect_id, template_id
├─ status (active/paused/completed/cancelled)
├─ started_at, paused_at, completed_at, cancelled_at

sequence_instance_steps
├─ id, instance_id, template_step_id
├─ step_order, channel, scheduled_at, executed_at
├─ status (pending/sent/failed/skipped)
├─ error_message, message_sent

calling_sessions
├─ id, user_id, titre, metier, ville
├─ source (tns/chefs), statut (active/pausee/terminee)
├─ created_at, updated_at

calling_session_contacts
├─ id, session_id, user_id, ordre
├─ siren, nom, entreprise, metier, ville
├─ telephone, email, adresse, source
├─ statut_appel (a_appeler/contacte/pas_repondu/pas_interesse/chaud)
├─ note, rappel_date, added_to_crm, called_at
├─ script_rating (1-5), objections_rencontrees (jsonb)

playbook_runs
├─ id, playbook_id, started_at, completed_at
├─ status (running/completed/failed/cancelled)
├─ prospects_found, prospects_validated, error

playbook_prospects
├─ id, run_id, playbook_id, signal_type
├─ score, company_name, siren, dirigeant_name
├─ secteur, localisation, ca_estime, signal_data (jsonb)
├─ message_j0_a/b/c, selected_variant, status
├─ prospect_id, sequence_id, validated_at

partners
├─ id, user_id, short_name, full_name, role, location
├─ badge, pressure, days_since, clients, notes[]
├─ action, mobile, email, linkedin, cabinet, city, fonction
├─ orbital_*, sort_order, created_at, updated_at
```

---

## 2. DONNÉES SUPPLÉMENTAIRES À STOCKER

### 2.1 Scoring engagement (nouvelle table)

Pour mesurer la chaleur d'un prospect au-delà du lead_score statique, on a besoin de tracker les interactions reçues (réponses, ouvertures, clics).

```sql
CREATE TABLE prospect_engagement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  
  event_type text NOT NULL CHECK (event_type IN (
    'email_opened', 'email_clicked', 'email_replied',
    'whatsapp_replied', 'sms_replied', 'linkedin_reply',
    'call_answered', 'call_voicemail', 'call_no_answer',
    'rdv_honored', 'rdv_no_show', 'rdv_rescheduled'
  )),
  
  occurred_at timestamptz NOT NULL DEFAULT now(),
  response_time_sec integer, -- Temps de réponse prospect (si applicable)
  metadata jsonb, -- Données canal spécifiques (sujet email, durée appel, etc.)
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_engagement_prospect ON prospect_engagement_log(prospect_id, occurred_at DESC);
CREATE INDEX idx_engagement_user_date ON prospect_engagement_log(user_id, occurred_at DESC);
```

**Pourquoi ?**
- Détecte automatiquement les prospects "chauds" (réponse < 1h sur WhatsApp)
- Calcule un score engagement temps réel (réponses / messages envoyés)
- Identifie les "prospects fantômes" (0 réponse après 5 touchpoints)

### 2.2 Lifecycle prospect (colonnes à ajouter dans `prospects`)

```sql
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS temperature text 
  DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold', 'dead'));
  
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS temperature_updated_at timestamptz;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS engagement_score numeric(5,2) 
  DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100);
  
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS last_engagement_at timestamptz;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS total_interactions integer DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS responded_interactions integer DEFAULT 0;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS inactivity_days integer 
  GENERATED ALWAYS AS (
    CASE 
      WHEN last_engagement_at IS NOT NULL 
      THEN EXTRACT(day FROM now() - last_engagement_at)::int
      ELSE EXTRACT(day FROM now() - created_at)::int
    END
  ) STORED;
```

**Pourquoi ?**
- `temperature` : Visuel immédiat (flamme rouge/orange/bleu/gris dans le CRM)
- `engagement_score` : KPI calculé automatiquement (voir fonction ci-dessous)
- `inactivity_days` : Tri automatique des prospects à relancer en priorité

### 2.3 Données tontine spécifiques (colonnes dans `prospects`)

```sql
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS capital_event_type text 
  CHECK (capital_event_type IN ('cession', 'heritage', 'vente_immo', 'dividendes', 'autre'));
  
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS capital_amount_detected numeric(12,2);

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS capital_event_date date;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS urgency_window_days integer;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS tontine_fit_score numeric(3,1) 
  CHECK (tontine_fit_score >= 0 AND tontine_fit_score <= 10);
```

**Pourquoi ?**
- Un capital détecté (cession entreprise, héritage) = fenêtre d'urgence (souvent 30-90 jours)
- Tontine = produit parfait pour optimisation succession/transmission
- `urgency_window_days` : Countdown visible dans TODAY (ex: "18 jours restants")

### 2.4 Performance des séquences (nouvelle table)

```sql
CREATE TABLE sequence_performance_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES sequence_templates(id) ON DELETE CASCADE,
  
  snapshot_date date NOT NULL,
  
  -- Métriques d'envoi
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  
  -- Métriques engagement
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  replied_count integer DEFAULT 0,
  
  -- Métriques conversion
  rdv_booked integer DEFAULT 0,
  converted integer DEFAULT 0,
  
  -- Taux calculés
  open_rate numeric(5,2),
  reply_rate numeric(5,2),
  conversion_rate numeric(5,2),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (user_id, template_id, snapshot_date)
);

CREATE INDEX idx_sequence_perf_template ON sequence_performance_snapshot(template_id, snapshot_date DESC);
```

**Pourquoi ?**
- Permet d'identifier les séquences "mortes" (< 5% réponse)
- Optimise les messages A/B testing (quelle variante cartonne ?)
- Historique performance pour Ted = "Cette séquence WhatsApp J0+J2+J7 m'a ramené 8 RDV le mois dernier"

### 2.5 Performance par canal (table agrégée)

```sql
CREATE TABLE channel_performance_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  date date NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'linkedin', 'appel')),
  
  sent_count integer DEFAULT 0,
  response_count integer DEFAULT 0,
  response_rate numeric(5,2),
  avg_response_time_hours numeric(8,2),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (user_id, date, channel)
);

CREATE INDEX idx_channel_perf_user_date ON channel_performance_daily(user_id, date DESC);
```

**Pourquoi ?**
- Ted voit immédiatement : "WhatsApp = 42% réponse, Email = 8% réponse" → focus WhatsApp
- Détecte saturation canal (si taux réponse SMS chute de 30% à 10% en 1 semaine = spam détecté)

---

## 3. FONCTIONS SQL POUR CALCULS AUTOMATIQUES

### 3.1 Calcul engagement_score

```sql
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_prospect_id uuid)
RETURNS numeric(5,2) AS $$
DECLARE
  v_total integer;
  v_responded integer;
  v_recent_replies integer;
  v_score numeric(5,2);
BEGIN
  -- Compte interactions des 90 derniers jours
  SELECT 
    COUNT(DISTINCT si.id) FILTER (WHERE si.status = 'sent'),
    COUNT(DISTINCT pel.id) FILTER (WHERE pel.event_type LIKE '%_replied'),
    COUNT(DISTINCT pel.id) FILTER (WHERE pel.event_type LIKE '%_replied' AND pel.occurred_at > now() - interval '14 days')
  INTO v_total, v_responded, v_recent_replies
  FROM sequence_instance_steps si
  LEFT JOIN prospect_engagement_log pel ON pel.prospect_id = p_prospect_id
  WHERE si.instance_id IN (
    SELECT id FROM sequence_instances WHERE prospect_id = p_prospect_id AND started_at > now() - interval '90 days'
  );
  
  IF v_total = 0 THEN RETURN 0; END IF;
  
  -- Base score = taux réponse * 100
  v_score := (v_responded::numeric / v_total::numeric) * 100;
  
  -- Bonus si réponse récente (< 14 jours)
  IF v_recent_replies > 0 THEN
    v_score := v_score + 20;
  END IF;
  
  RETURN LEAST(100, v_score);
END;
$$ LANGUAGE plpgsql;
```

### 3.2 Mise à jour automatique de temperature

```sql
CREATE OR REPLACE FUNCTION update_prospect_temperature()
RETURNS trigger AS $$
DECLARE
  v_score numeric(5,2);
  v_new_temp text;
BEGIN
  -- Recalcule engagement_score
  v_score := calculate_engagement_score(NEW.id);
  
  -- Détermine température
  IF v_score >= 70 THEN v_new_temp := 'hot';
  ELSIF v_score >= 40 THEN v_new_temp := 'warm';
  ELSIF v_score >= 10 THEN v_new_temp := 'cold';
  ELSE v_new_temp := 'dead';
  END IF;
  
  -- Met à jour si changement
  IF NEW.temperature IS DISTINCT FROM v_new_temp THEN
    NEW.temperature := v_new_temp;
    NEW.temperature_updated_at := now();
  END IF;
  
  NEW.engagement_score := v_score;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prospect_temperature
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  WHEN (
    OLD.responded_interactions IS DISTINCT FROM NEW.responded_interactions
    OR OLD.last_engagement_at IS DISTINCT FROM NEW.last_engagement_at
  )
  EXECUTE FUNCTION update_prospect_temperature();
```

---

## 4. REQUÊTES PAR ONGLET

### 4.1 Onglet TODAY (priorités du jour)

**Route API** : `/api/today/signal`

#### Relances du jour (tri par urgence tontine)

```sql
SELECT 
  p.id,
  p.full_name,
  p.profession,
  p.pipeline_stage,
  p.next_action_date,
  p.lead_score,
  p.engagement_score,
  p.temperature,
  p.phone,
  p.email,
  p.capital_event_type,
  p.urgency_window_days,
  p.inactivity_days,
  -- Calcul priorité composite
  CASE 
    WHEN p.urgency_window_days IS NOT NULL AND p.urgency_window_days <= 7 THEN 100
    WHEN p.temperature = 'hot' THEN 90
    WHEN p.urgency_window_days IS NOT NULL AND p.urgency_window_days <= 30 THEN 80
    WHEN p.temperature = 'warm' THEN 70
    ELSE p.lead_score
  END as priority_score
FROM prospects p
WHERE p.user_id = $1
  AND p.next_action_date <= CURRENT_DATE
  AND p.pipeline_stage NOT IN ('converti', 'perdu')
ORDER BY priority_score DESC, p.next_action_date ASC
LIMIT 20;
```

**Pourquoi ce tri ?**
1. Capital event < 7 jours = URGENCE MAXIMALE (tontine = fenêtre courte)
2. Prospect HOT = répond aux messages = priorité haute
3. Capital event < 30 jours = priorité élevée
4. Prospect WARM = engagé mais pas ultra chaud
5. Sinon tri par lead_score classique

#### RDV du jour

```sql
SELECT 
  i.id,
  i.type,
  i.occurred_at,
  i.notes,
  i.calendar_event_id,
  p.id as prospect_id,
  p.full_name as prospect_name,
  p.profession,
  p.temperature,
  p.capital_event_type,
  p.urgency_window_days
FROM interactions i
INNER JOIN prospects p ON p.id = i.prospect_id
WHERE i.user_id = $1
  AND i.type IN ('rdv1', 'rdv2', 'rdv3')
  AND DATE(i.occurred_at) = CURRENT_DATE
ORDER BY i.occurred_at ASC;
```

#### Messages séquence à valider

```sql
SELECT 
  sis.id,
  sis.channel,
  sis.scheduled_at,
  sis.message_sent,
  p.id as prospect_id,
  p.full_name as prospect_name,
  p.temperature,
  st.name as sequence_name
FROM sequence_instance_steps sis
INNER JOIN sequence_instances si ON si.id = sis.instance_id
INNER JOIN prospects p ON p.id = si.prospect_id
LEFT JOIN sequence_templates st ON st.id = si.template_id
WHERE si.user_id = $1
  AND sis.status = 'pending'
  AND sis.scheduled_at <= now() + interval '2 hours'
  AND si.status = 'active'
ORDER BY sis.scheduled_at ASC
LIMIT 10;
```

#### KPIs du jour

```sql
-- Déjà implémenté dans /api/today/kpis
SELECT 
  COALESCE(dk.contacts, 0) as contacts,
  COALESCE(dk.calls, 0) as calls,
  COALESCE(dk.rdv1, 0) as rdv1,
  COALESCE(dk.rdv2, 0) as rdv2,
  COALESCE(dk.blocks, 0) as blocks,
  us.calls_per_day_target,
  us.rdv_per_week_target / 5 as rdv_per_day_target,
  us.blocks_per_day_target
FROM daily_kpis dk
RIGHT JOIN user_settings us ON us.id = $1
WHERE dk.user_id = $1 
  AND dk.date = CURRENT_DATE;
```

---

### 4.2 Onglet SEMAINE (vue hebdo)

**Route API** : `/api/dashboard/weekly`

#### Planning RDV semaine

```sql
SELECT 
  i.id,
  i.type,
  i.occurred_at,
  i.notes,
  p.id as prospect_id,
  p.full_name,
  p.profession,
  p.temperature,
  p.pipeline_stage,
  EXTRACT(DOW FROM i.occurred_at) as day_of_week
FROM interactions i
INNER JOIN prospects p ON p.id = i.prospect_id
WHERE i.user_id = $1
  AND i.type IN ('rdv1', 'rdv2', 'rdv3')
  AND i.occurred_at >= date_trunc('week', CURRENT_DATE)
  AND i.occurred_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
ORDER BY i.occurred_at ASC;
```

#### Pipeline movement cette semaine

```sql
SELECT 
  pe.from_stage,
  pe.to_stage,
  COUNT(*) as move_count,
  SUM(CASE WHEN pe.to_stage = 'converti' THEN 1 ELSE 0 END) as converted_count,
  SUM(CASE WHEN pe.to_stage = 'perdu' THEN 1 ELSE 0 END) as lost_count
FROM pipeline_events pe
WHERE pe.user_id = $1
  AND pe.occurred_at >= date_trunc('week', CURRENT_DATE)
  AND pe.occurred_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
GROUP BY pe.from_stage, pe.to_stage;
```

#### Objectif CA vs réalisé (mois en cours)

```sql
SELECT 
  COALESCE(SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'percue'), 0) as ca_realise,
  COALESCE(SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'attendue'), 0) as ca_pipeline,
  us.ca_monthly_target
FROM contracts c
RIGHT JOIN user_settings us ON us.id = $1
WHERE c.user_id = $1
  AND c.signed_at >= date_trunc('month', CURRENT_DATE)
  AND c.signed_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
GROUP BY us.ca_monthly_target;
```

#### Alertes semaine

```sql
-- Clients inactifs (> 90 jours sans interaction)
SELECT 
  'client_inactif' as alert_type,
  p.id as prospect_id,
  p.full_name,
  p.last_contact_at,
  EXTRACT(day FROM now() - p.last_contact_at) as days_inactive
FROM clients c
INNER JOIN prospects p ON p.id = c.prospect_id
WHERE c.user_id = $1
  AND p.last_contact_at < now() - interval '90 days'
ORDER BY p.last_contact_at ASC
LIMIT 5;

-- Séquences bloquées (erreurs répétées)
SELECT 
  'sequence_blocked' as alert_type,
  si.id as instance_id,
  p.full_name as prospect_name,
  st.name as sequence_name,
  COUNT(sis.id) FILTER (WHERE sis.status = 'failed') as failed_steps
FROM sequence_instances si
INNER JOIN prospects p ON p.id = si.prospect_id
LEFT JOIN sequence_templates st ON st.id = si.template_id
INNER JOIN sequence_instance_steps sis ON sis.instance_id = si.id
WHERE si.user_id = $1
  AND si.status = 'active'
  AND sis.status = 'failed'
  AND sis.executed_at > now() - interval '7 days'
GROUP BY si.id, p.full_name, st.name
HAVING COUNT(sis.id) >= 2
LIMIT 5;
```

---

### 4.3 Onglet TÂCHES

**Route API** : `/api/today/relances` (existant, à étendre)

#### Relances en retard (next_action_date < today)

```sql
SELECT 
  p.id,
  p.full_name,
  p.profession,
  p.phone,
  p.email,
  p.pipeline_stage,
  p.next_action_date,
  p.temperature,
  p.urgency_window_days,
  CURRENT_DATE - p.next_action_date as days_overdue
FROM prospects p
WHERE p.user_id = $1
  AND p.next_action_date < CURRENT_DATE
  AND p.pipeline_stage NOT IN ('converti', 'perdu')
ORDER BY days_overdue DESC, p.temperature DESC
LIMIT 50;
```

#### Relances du jour

```sql
-- Déjà implémenté via table tasks (badge='relance')
SELECT 
  t.id,
  t.title as name,
  t.priority,
  t.estimated_time as status,
  t.description as note
FROM tasks t
WHERE t.user_id = $1
  AND t.badge = 'relance'
  AND t.col != 'done'
ORDER BY t.priority DESC, t.created_at DESC;
```

#### Relances à venir (J+1 à J+7)

```sql
SELECT 
  p.id,
  p.full_name,
  p.profession,
  p.phone,
  p.next_action_date,
  p.temperature,
  p.pipeline_stage,
  p.next_action_date - CURRENT_DATE as days_until
FROM prospects p
WHERE p.user_id = $1
  AND p.next_action_date > CURRENT_DATE
  AND p.next_action_date <= CURRENT_DATE + 7
  AND p.pipeline_stage NOT IN ('converti', 'perdu')
ORDER BY p.next_action_date ASC, p.temperature DESC;
```

---

### 4.4 Onglet CRM (Kanban)

**Route API** : `/api/prospects` (existant, à étendre)

#### Prospects par colonne avec métadonnées

```sql
SELECT 
  p.id,
  p.full_name,
  p.profession,
  p.company,
  p.city,
  p.phone,
  p.email,
  p.pipeline_stage,
  p.lead_score,
  p.engagement_score,
  p.temperature,
  p.capital_event_type,
  p.urgency_window_days,
  p.tags,
  p.notes,
  p.source,
  
  -- Dernière interaction
  (
    SELECT i.occurred_at 
    FROM interactions i 
    WHERE i.prospect_id = p.id 
    ORDER BY i.occurred_at DESC 
    LIMIT 1
  ) as last_interaction_at,
  
  -- Type dernière interaction
  (
    SELECT i.type 
    FROM interactions i 
    WHERE i.prospect_id = p.id 
    ORDER BY i.occurred_at DESC 
    LIMIT 1
  ) as last_interaction_type,
  
  -- Séquences actives
  (
    SELECT COUNT(*) 
    FROM sequence_instances si 
    WHERE si.prospect_id = p.id 
      AND si.status = 'active'
  ) as active_sequences_count,
  
  -- Prochaine step séquence
  (
    SELECT sis.scheduled_at 
    FROM sequence_instance_steps sis
    INNER JOIN sequence_instances si ON si.id = sis.instance_id
    WHERE si.prospect_id = p.id 
      AND si.status = 'active'
      AND sis.status = 'pending'
    ORDER BY sis.scheduled_at ASC
    LIMIT 1
  ) as next_sequence_step_at
  
FROM prospects p
WHERE p.user_id = $1
  AND p.pipeline_stage = $2
ORDER BY 
  CASE 
    WHEN p.temperature = 'hot' THEN 1
    WHEN p.temperature = 'warm' THEN 2
    WHEN p.temperature = 'cold' THEN 3
    ELSE 4
  END,
  p.engagement_score DESC,
  p.updated_at DESC;
```

**Pourquoi ces colonnes calculées ?**
- `last_interaction_at` + `type` : Ted voit immédiatement "Dernier contact WhatsApp il y a 3 jours"
- `active_sequences_count` : Badge visuel "Séquence en cours" sur la card
- `next_sequence_step_at` : "Prochain message dans 2h" → anticipe la charge

#### Agrégats par colonne (KPI header)

```sql
SELECT 
  p.pipeline_stage,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE p.temperature = 'hot') as hot_count,
  COUNT(*) FILTER (WHERE p.temperature = 'warm') as warm_count,
  COUNT(*) FILTER (WHERE p.urgency_window_days IS NOT NULL AND p.urgency_window_days <= 30) as urgent_count,
  -- Estimation CA pipeline (si capital_amount_detected existe)
  SUM(COALESCE(p.capital_amount_detected, 0) * 0.02) as estimated_revenue
FROM prospects p
WHERE p.user_id = $1
GROUP BY p.pipeline_stage;
```

---

## 5. DIAGRAMME FLUX DONNÉES

```
┌──────────────────────────────────────────────────────────────┐
│                      SOURCES DE DONNÉES                       │
└──────────────────────────────────────────────────────────────┘
         │
         ├─► Playbooks (API externe) ──► playbook_prospects
         │                                     │
         ├─► Prospection TNS/Chefs ───► scraping_results
         │                                     │
         ├─► Calling Sessions ────────► calling_session_contacts
         │                                     │
         └─► LinkedIn/WhatsApp ───────► interactions (type='linkedin')
                                               │
                            TRANSFORMATION & NORMALISATION
                                               │
                                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    TABLE CENTRALE: PROSPECTS                  │
│  - lead_score (initial, statique)                            │
│  - engagement_score (calculé dynamiquement)                  │
│  - temperature (hot/warm/cold/dead)                          │
│  - urgency_window_days (capital events)                      │
│  - inactivity_days (auto-calculé)                            │
└──────────────────────────────────────────────────────────────┘
         │
         ├─────────► INTERACTIONS ◄──── Séquences (executor)
         │                  │
         │                  └──► prospect_engagement_log
         │                            │
         │                            └──► Trigger update engagement_score
         │                                      │
         ├─────────────────────────────────────┘
         │
         ├─► PIPELINE_EVENTS (transitions de stage)
         │
         ├─► SEQUENCE_INSTANCES (relances automatiques)
         │         │
         │         └─► sequence_instance_steps
         │                  │
         │                  └─► channel_performance_daily (agrégat)
         │
         └─► CLIENTS ──► CONTRACTS ──► CA mensuel
                                        │
                                        └─► revenue_objectives

┌──────────────────────────────────────────────────────────────┐
│                    VUES MATÉRIALISÉES (CACHE)                 │
└──────────────────────────────────────────────────────────────┘

-- Refresh toutes les 5 minutes
CREATE MATERIALIZED VIEW today_priority_prospects AS
  SELECT [requête 4.1 Relances du jour]
  
CREATE MATERIALIZED VIEW weekly_dashboard_kpis AS
  SELECT [requête 4.2 Planning + Pipeline]

-- Refresh tous les jours à minuit (cron)
CREATE MATERIALIZED VIEW sequence_performance_aggregate AS
  SELECT 
    template_id,
    AVG(reply_rate) as avg_reply_rate,
    AVG(conversion_rate) as avg_conversion_rate,
    MAX(snapshot_date) as last_update
  FROM sequence_performance_snapshot
  WHERE snapshot_date > CURRENT_DATE - 30
  GROUP BY template_id;
```

---

## 6. OPTIMISATIONS PERFORMANCES

### 6.1 Index critiques à ajouter

```sql
-- Tri Today par température + urgence
CREATE INDEX idx_prospects_temperature_urgency 
  ON prospects(user_id, temperature, urgency_window_days, next_action_date)
  WHERE pipeline_stage NOT IN ('converti', 'perdu');

-- Filtre séquences actives
CREATE INDEX idx_sequence_instances_active 
  ON sequence_instances(prospect_id, status, started_at)
  WHERE status = 'active';

-- Agrégation performance canal
CREATE INDEX idx_engagement_log_channel 
  ON prospect_engagement_log(user_id, occurred_at, event_type);

-- CRM join interactions
CREATE INDEX idx_interactions_prospect_recent 
  ON interactions(prospect_id, occurred_at DESC);
```

### 6.2 Partitioning (si > 100k prospects)

```sql
-- Partition interactions par mois (historique long)
CREATE TABLE interactions_partitioned (
  LIKE interactions INCLUDING ALL
) PARTITION BY RANGE (occurred_at);

CREATE TABLE interactions_2026_01 PARTITION OF interactions_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
  
-- etc. (1 partition par mois)
```

---

## 7. PRIORITÉS D'IMPLÉMENTATION

### Phase 1 : Scoring Engagement (Critique)
**Deadline : 08/07/2026**
- [ ] Créer `prospect_engagement_log`
- [ ] Ajouter colonnes `temperature`, `engagement_score`, `last_engagement_at` dans `prospects`
- [ ] Implémenter fonction `calculate_engagement_score()`
- [ ] Créer trigger `update_prospect_temperature()`
- [ ] Migrer route `/api/today/signal` pour utiliser `temperature` + `urgency_window_days`

**Impact** : Today devient hyper actionnable (tri par chaleur réelle, pas juste lead_score)

### Phase 2 : Capital Events (High Value)
**Deadline : 10/07/2026**
- [ ] Ajouter colonnes `capital_event_type`, `capital_amount_detected`, `urgency_window_days` dans `prospects`
- [ ] Implémenter détection automatique capital events dans playbooks engine
- [ ] Ajouter badge "🔥 Capital Event J-12" dans cards CRM
- [ ] Créer filtre Today "Urgence capital" (< 7 jours)

**Impact** : Tontine = produit phare Ted → priorisation automatique fenêtres critiques

### Phase 3 : Performance Séquences (Optimisation)
**Deadline : 15/07/2026**
- [ ] Créer `sequence_performance_snapshot`
- [ ] Créer `channel_performance_daily`
- [ ] Implémenter cron snapshot quotidien (minuit)
- [ ] Ajouter onglet Analytics/Séquences avec graphiques taux réponse par canal
- [ ] Alertes auto si séquence < 5% réponse → pause + notification Telegram

**Impact** : Optimisation continue messages → +20% taux réponse attendu

### Phase 4 : CRM Enrichi (UX)
**Deadline : 20/07/2026**
- [ ] Migrer route `/api/prospects` pour inclure subqueries (last_interaction, active_sequences)
- [ ] Ajouter badges visuels temperature (🔥 hot, 🟠 warm, ❄️ cold, ☠️ dead)
- [ ] Implémenter filtre "Prospects chauds seulement" (temperature IN ('hot','warm'))
- [ ] Ajouter colonne "Inactif depuis X jours" triable

**Impact** : Kanban devient tableau de bord live (pas juste liste statique)

### Phase 5 : Vues matérialisées (Performance)
**Deadline : 25/07/2026**
- [ ] Créer `today_priority_prospects` (refresh 5min)
- [ ] Créer `weekly_dashboard_kpis` (refresh 10min)
- [ ] Implémenter cache Redis pour `/api/today/signal` (TTL 2min)
- [ ] Benchmark temps réponse API (objectif < 200ms)

**Impact** : Dashboard reste fluide même avec 10k prospects

---

## 8. ANNEXE : EXEMPLES DE REQUÊTES MÉTIER

### A. Top 10 prospects "chauds" capital event

```sql
SELECT 
  p.full_name,
  p.capital_event_type,
  p.capital_amount_detected,
  p.urgency_window_days,
  p.temperature,
  p.engagement_score,
  p.phone
FROM prospects p
WHERE p.user_id = $1
  AND p.capital_event_type IS NOT NULL
  AND p.urgency_window_days <= 30
  AND p.temperature IN ('hot', 'warm')
  AND p.pipeline_stage NOT IN ('converti', 'perdu')
ORDER BY 
  p.urgency_window_days ASC,
  p.engagement_score DESC
LIMIT 10;
```

### B. Séquences sous-performantes (à optimiser)

```sql
SELECT 
  st.name,
  sps.template_id,
  AVG(sps.reply_rate) as avg_reply,
  COUNT(DISTINCT si.prospect_id) as prospects_count
FROM sequence_performance_snapshot sps
INNER JOIN sequence_templates st ON st.id = sps.template_id
INNER JOIN sequence_instances si ON si.template_id = sps.template_id
WHERE sps.user_id = $1
  AND sps.snapshot_date > CURRENT_DATE - 30
GROUP BY st.name, sps.template_id
HAVING AVG(sps.reply_rate) < 5
ORDER BY prospects_count DESC;
```

### C. Clients à risque (inactifs > 90 jours + AUM élevé)

```sql
SELECT 
  p.full_name,
  c.total_aum,
  p.last_contact_at,
  EXTRACT(day FROM now() - p.last_contact_at) as days_inactive,
  p.phone,
  p.email
FROM clients c
INNER JOIN prospects p ON p.id = c.prospect_id
WHERE c.user_id = $1
  AND p.last_contact_at < now() - interval '90 days'
  AND c.total_aum > 100000
ORDER BY c.total_aum DESC, days_inactive DESC;
```

---

## 9. CHECKLIST VALIDATION

Avant de merger cette architecture :

- [ ] Toutes les migrations SQL testées en local (validation schéma)
- [ ] Index créés (test performance sur dataset 1000 prospects)
- [ ] Triggers engagement_score testés (update 1 prospect = recalcul < 50ms)
- [ ] Routes API `/api/today/signal`, `/api/crm`, `/api/dashboard/weekly` migrées
- [ ] Tests E2E Playwright passent (dashboard Today + CRM)
- [ ] Documentation API mise à jour (`docs/api-reference.md`)

---

**Auteur** : Claude Sonnet 4.5 (Architecture Agent)  
**Date** : 05/07/2026  
**Version** : 1.0  
**Statut** : Proposition initiale (en attente validation Ted)
