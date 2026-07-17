-- Migration 20260716 : Bucket Supabase Storage pour documents nurturing

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nurturing-docs',
  'nurturing-docs',
  true,
  10485760, -- 10 MB max
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own nurturing docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'nurturing-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read nurturing docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nurturing-docs');

CREATE POLICY "Users delete own nurturing docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'nurturing-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
