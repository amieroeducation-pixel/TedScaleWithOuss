-- Seed Jean Test pour nurturing
DO $$
DECLARE
  v_user_id uuid := '2bdacf53-216a-42fa-8fcf-66ec109e3b98';
  v_jean_id uuid;
  v_theme_id uuid;
  v_doc_id uuid;
BEGIN
  -- Créer Jean Test
  INSERT INTO prospects (user_id, full_name, email, phone, profession, company, city, linkedin_url, pipeline_stage, nurturing_category, source, next_action_date, next_action_channel, preferred_channel, contact_frequency_days, preferred_time_slot, last_contact_at, notes, temperature, pressure_score, nb_relances_sans_reponse, total_touchpoints, responded_touchpoints)
  VALUES (
    v_user_id,
    'Jean Test',
    'jean.test@exemple.fr',
    '0612345678',
    'Dentiste',
    'Cabinet Test',
    'Paris',
    'https://linkedin.com/in/jean-test',
    'rdv1',
    'rdv_fait',
    'recommandation',
    CURRENT_DATE,
    'telephone',
    'telephone',
    14,
    'matin',
    NOW() - INTERVAL '2 days',
    'Aime le golf, enfants en etudes sup, sensible defiscalisation. Prefere qu on l appelle le matin.',
    'hot',
    'normal',
    3,
    5,
    2
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_jean_id;

  IF v_jean_id IS NULL THEN
    SELECT id INTO v_jean_id FROM prospects WHERE full_name = 'Jean Test' AND user_id = v_user_id LIMIT 1;
  END IF;

  -- Interactions
  INSERT INTO interactions (user_id, prospect_id, type, notes, occurred_at) VALUES
    (v_user_id, v_jean_id, 'appel', 'Premier appel - interesse retraite TNS, veut une simulation', NOW() - INTERVAL '21 days'),
    (v_user_id, v_jean_id, 'email', 'Envoi simulation retraite TNS + doc SCPI', NOW() - INTERVAL '18 days'),
    (v_user_id, v_jean_id, 'rdv1', 'RDV cabinet 45min - retraite TNS + prevoyance. Tres receptif.', NOW() - INTERVAL '14 days'),
    (v_user_id, v_jean_id, 'email', 'Relance post-RDV avec recapitulatif + devis', NOW() - INTERVAL '10 days'),
    (v_user_id, v_jean_id, 'whatsapp', 'Micro-relance J+5 - pas de reponse', NOW() - INTERVAL '5 days'),
    (v_user_id, v_jean_id, 'linkedin', 'Like + commentaire sur son post entrepreneuriat', NOW() - INTERVAL '3 days');

  -- Themes
  INSERT INTO nurturing_themes (user_id, name, color, icon) VALUES
    (v_user_id, 'Retraite TNS', '#4ecdc4', '🏦')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_theme_id;

  IF v_theme_id IS NULL THEN
    SELECT id INTO v_theme_id FROM nurturing_themes WHERE name = 'Retraite TNS' AND user_id = v_user_id LIMIT 1;
  END IF;

  INSERT INTO nurturing_themes (user_id, name, color, icon) VALUES
    (v_user_id, 'Immobilier SCPI', '#a78bfa', '🏠'),
    (v_user_id, 'Defiscalisation', '#fbbf24', '📉'),
    (v_user_id, 'Prevoyance', '#ff6470', '🛡️'),
    (v_user_id, 'Entreprise', '#818cf8', '🏢')
  ON CONFLICT DO NOTHING;

  -- Document
  INSERT INTO nurturing_documents (user_id, title, theme_id, format, channels_compatible, tags)
  VALUES (v_user_id, 'Simulateur Retraite TNS 2026', v_theme_id, 'pdf', ARRAY['email','whatsapp'], ARRAY['retraite','tns','simulation'])
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_doc_id;

  IF v_doc_id IS NOT NULL AND v_jean_id IS NOT NULL THEN
    INSERT INTO nurturing_document_sends (user_id, prospect_id, document_id, channel)
    VALUES (v_user_id, v_jean_id, v_doc_id, 'email')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Messages PP1/PP2
  INSERT INTO nurturing_messages (user_id, title, channel, subject, body, tip, tag, tags) VALUES
    (v_user_id, 'Relance contextualisee apres rencontre', 'email', 'Suite a notre echange', '{Prenom}, on a echange {contexte_lieu} - votre situation en tant que {profession} m a interpelle. J ai quelques pistes concretes sur {besoin_detecte}...', 'PP1 : Les 2 premieres lignes sont decisives. Ancrez dans un contexte reel partage. Evitez le pitch, creez la curiosite.', 'PP1', ARRAY['pp1','premier_contact']),
    (v_user_id, 'Micro-relance WhatsApp (J+5)', 'whatsapp', NULL, '{Prenom}, je reviens vers vous suite a notre echange sur {sujet}. Est-ce que le sujet est toujours d actualite ? Si ce n est pas le bon moment, pas de souci.', 'PP2 : Court, pas intrusif, offre une porte de sortie. Un vocal 30s vaut 10 messages ecrits. Max 2 touchpoints/semaine.', 'PP2', ARRAY['pp2','relance']),
    (v_user_id, 'Demande connexion LinkedIn ultra-personnalisee', 'linkedin', NULL, '{Prenom}, j ai vu votre parcours dans {secteur} - particulierement votre experience chez {entreprise}. Mon expertise en {domaine} pourrait vous etre utile. Connectons-nous ?', 'PP1 : Pas de pitch dans le message de connexion. L accroche = reconnaissance + curiosite. Citer un element concret du profil.', 'PP1', ARRAY['pp1','cold_outreach']),
    (v_user_id, 'Script telephone post-RDV', 'telephone', NULL, 'Bonjour {Prenom}, c est {votre_nom}. On s est echange lors de {contexte}. Je vous appelle parce que j ai finalise {livrable_promis}. Vous avez 2 minutes ou je vous rappelle ?', 'PP1 : Identifiez-vous + contexte en 10s. UNE question ouverte. 2 min max si non qualifie. Meilleur creneau : mardi-jeudi 9h-11h30.', 'PP1', ARRAY['pp1','telephone','chaud']),
    (v_user_id, 'Email de rupture bienveillant', 'email', 'Je vous laisse tranquille', '{Prenom}, je comprends que ce n est peut-etre pas le bon moment pour echanger sur {sujet}. Je vous laisse mes coordonnees si besoin a l avenir. Belle continuation !', 'PP2 : Apres 6 tentatives sans interaction (froid) ou 3 non-reponses (tiede), STOP propre obligatoire. Preserve la relation long terme.', 'PP2', ARRAY['pp2','rupture','obligatoire']),
    (v_user_id, 'Vocal WhatsApp valeur (30s)', 'whatsapp', NULL, '[Vocal] Salut {Prenom} ! Ecoute, je viens de tomber sur {info_pertinente_secteur} et j ai pense a toi direct. Ca pourrait t interesser pour {benefice_concret}. Dis-moi si tu veux qu on en parle 2 minutes !', 'PP1 : Un vocal 30s vaut 10 messages ecrits. Ton conversationnel, apport de valeur immediat. PP2 : Ne jamais spammer WhatsApp, J+5 ou J+10 max.', 'PP1+PP2', ARRAY['pp1','pp2','whatsapp','vocal'])
  ON CONFLICT DO NOTHING;

END $$;
