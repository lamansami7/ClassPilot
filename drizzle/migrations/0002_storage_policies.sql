CREATE POLICY "Students read own files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('recordings','uploads') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students upload own files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('recordings','uploads') AND (storage.foldername(name))[1] = auth.uid()::text AND public.is_approved(auth.uid()));
CREATE POLICY "Students update own files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('recordings','uploads') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students delete own files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('recordings','uploads') AND (storage.foldername(name))[1] = auth.uid()::text);
