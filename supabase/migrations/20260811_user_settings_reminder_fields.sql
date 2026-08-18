-- Ted Scale With Ouss — Rappels SMS automatiques
-- Migration 20260811: Ajouter champs reminder dans user_settings

-- ============================================================
-- ALTER TABLE user_settings
-- ============================================================

alter table user_settings
  add column if not exists reminder_enabled boolean default true,
  add column if not exists reminder_delay_24h integer default 24,
  add column if not exists reminder_delay_1h numeric(3,1) default 1.0;

-- ============================================================
-- COMMENTAIRES
-- ============================================================

comment on column user_settings.reminder_enabled is 'Activer/désactiver les rappels SMS automatiques';
comment on column user_settings.reminder_delay_24h is 'Délai en heures pour le rappel anticipé (défaut: 24h)';
comment on column user_settings.reminder_delay_1h is 'Délai en heures pour le rappel imminent (défaut: 1h)';
