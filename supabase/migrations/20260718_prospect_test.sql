-- Migration 20260718 : Prospect de test pour nurturing

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'amiero.education@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User introuvable — seed ignoré';
    RETURN;
  END IF;

  INSERT INTO prospects (
    user_id,
    full_name,
    email,
    phone,
    profession,
    pipeline_stage,
    nurturing_category,
    temperature,
    pressure_score,
    nb_relances_sans_reponse,
    next_action_date,
    next_action_channel,
    last_contact_at,
    total_touchpoints,
    responded_touchpoints,
    notes
  ) VALUES (
    v_user_id,
    'Jean Dupont',
    'jean.dupont@exemple.fr',
    '0612345678',
    'Entrepreneur TNS',
    'en_discussion',
    'rdv_fait',
    'warm',
    'normal',
    0,
    CURRENT_DATE + INTERVAL '2 days',
    'email',
    CURRENT_DATE - INTERVAL '5 days',
    8,
    5,
    'Prospect test pour démonstration nurturing'
  ) ON CONFLICT DO NOTHING;

  -- Ajouter quelques interactions de test
  INSERT INTO interactions (
    user_id,
    prospect_id,
    type,
    notes,
    occurred_at,
    is_honored
  )
  SELECT
    v_user_id,
    p.id,
    'email',
    'Email de suivi envoyé',
    CURRENT_DATE - INTERVAL '5 days',
    true
  FROM prospects p
  WHERE p.full_name = 'Jean Dupont' AND p.user_id = v_user_id
  LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO interactions (
    user_id,
    prospect_id,
    type,
    notes,
    occurred_at,
    responded_at,
    is_honored
  )
  SELECT
    v_user_id,
    p.id,
    'appel',
    'Appel téléphonique — intéressé retraite TNS',
    CURRENT_DATE - INTERVAL '8 days',
    CURRENT_DATE - INTERVAL '8 days',
    true
  FROM prospects p
  WHERE p.full_name = 'Jean Dupont' AND p.user_id = v_user_id
  LIMIT 1
  ON CONFLICT DO NOTHING;

END $$;
