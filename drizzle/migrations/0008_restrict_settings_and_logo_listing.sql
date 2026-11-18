DROP POLICY IF EXISTS "settings readable by signed-in" ON public.platform_settings;
CREATE POLICY "settings readable by admin" ON public.platform_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;
CREATE POLICY "Admins can list company logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'admin'));