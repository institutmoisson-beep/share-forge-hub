DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "View own or staff profiles" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_utilisateurs') OR public.has_role(auth.uid(),'moderateur') OR public.has_role(auth.uid(),'financier'));

CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(user_id uuid, msn_id text, first_name text, last_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.msn_id, p.first_name, p.last_name FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.user_id = ANY(_ids)
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

DROP POLICY IF EXISTS "settings readable" ON public.platform_settings;
CREATE POLICY "settings readable by signed-in" ON public.platform_settings FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone authenticated can view listings" ON public.p2p_listings;
CREATE POLICY "View relevant listings" ON public.p2p_listings FOR SELECT TO authenticated
USING (
  auth.uid() IN (seller_id, buyer_id, target_buyer_id)
  OR (status = 'active' AND target_buyer_id IS NULL AND issuer_approval IN ('not_required','approved'))
  OR public.has_role(auth.uid(),'admin')
  OR public.is_issuer_of(auth.uid(), company_id)
);

DROP POLICY IF EXISTS "Authenticated view listing units" ON public.listing_units;
CREATE POLICY "View units of visible listings" ON public.listing_units FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.p2p_listings l WHERE l.id = listing_id));