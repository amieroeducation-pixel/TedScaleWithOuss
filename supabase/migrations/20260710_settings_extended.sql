-- Extend user_settings table with all new fields for settings UI persistence
-- Uses ADD COLUMN IF NOT EXISTS for safety (idempotent)

-- JSONB complex objects (some may already exist from prior migrations)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_targets jsonb DEFAULT '{"contacts":10,"calls":20,"rdv1":2,"rdv2":1}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS monthly_intensity jsonb DEFAULT '{"jan":1.0,"feb":1.0,"mar":1.0,"apr":1.0,"may":1.0,"jun":0.9,"jul":0.5,"aug":0.3,"sep":1.0,"oct":1.0,"nov":1.0,"dec":0.7}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS scoring_grids jsonb DEFAULT '{"professions":[],"zones":[]}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS completed_videos jsonb DEFAULT '[]';

-- General tab fields
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS coach_instructions text DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS objectives_count integer DEFAULT 3;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS bloc_duration_minutes integer DEFAULT 25;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS blocs_per_day_normal integer DEFAULT 6;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS blocs_per_day_max integer DEFAULT 10;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sequence_delay_email integer DEFAULT 3;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sequence_delay_sms integer DEFAULT 2;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sequence_delay_whatsapp integer DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sequence_steps_max integer DEFAULT 5;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sequence_stop_days integer DEFAULT 30;

-- KPI tab fields
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rdv_r1_annual integer DEFAULT 200;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rdv_r2_annual integer DEFAULT 100;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rdv_monthly_distribution jsonb DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS interpro_daily_target integer DEFAULT 5;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS commerce_minutes_daily integer DEFAULT 120;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sport_weekly_target integer DEFAULT 3;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS collecte_annual integer DEFAULT 500000;

-- Notifications
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_channels jsonb DEFAULT '{"push":true,"email":true,"sms":false,"telegram":false}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_email text DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_phone text DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_telegram_bot text DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_telegram_chat text DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_events jsonb DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_rdv_hours integer DEFAULT 24;

-- Affichage
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS visible_sections jsonb DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mobile_sections jsonb DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mobile_font_size text DEFAULT 'medium';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mobile_compact boolean DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mobile_bottom_menu boolean DEFAULT true;
