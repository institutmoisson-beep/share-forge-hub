CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('cni','passeport','permis','selfie','autre')),
  file_path text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kyc read" ON public.kyc_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_utilisateurs'));
CREATE POLICY "own kyc insert" ON public.kyc_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_note text;

-- Users cannot change their own compliance fields
CREATE OR REPLACE FUNCTION public.guard_profile_compliance() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.compliance_rpc', true),'') = 'on' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status OR NEW.is_frozen IS DISTINCT FROM OLD.is_frozen
     OR NEW.risk_ack_at IS DISTINCT FROM OLD.risk_ack_at OR NEW.kyc_note IS DISTINCT FROM OLD.kyc_note
     OR NEW.msn_id IS DISTINCT FROM OLD.msn_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Ces informations ne peuvent être modifiées que par la plateforme';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_compliance_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_compliance();

CREATE OR REPLACE FUNCTION public.accept_risk_warning() RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  PERFORM set_config('app.compliance_rpc','on', true);
  UPDATE public.profiles SET risk_ack_at = coalesce(risk_ack_at, now()) WHERE user_id = auth.uid() RETURNING risk_ack_at INTO ts;
  PERFORM set_config('app.compliance_rpc','off', true);
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details) VALUES (auth.uid(),'risk_accepted','profile',auth.uid(), jsonb_build_object('at',ts));
  RETURN ts;
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_risk_warning() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_kyc() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.kyc_documents WHERE user_id = auth.uid() AND status='pending') THEN
    RAISE EXCEPTION 'Ajoutez au moins une pièce d''identité';
  END IF;
  PERFORM set_config('app.compliance_rpc','on', true);
  UPDATE public.profiles SET kyc_status='pending', kyc_note=NULL WHERE user_id = auth.uid() AND kyc_status <> 'approved';
  PERFORM set_config('app.compliance_rpc','off', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_kyc() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(_user_id uuid, _approve boolean, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_utilisateurs')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  PERFORM set_config('app.compliance_rpc','on', true);
  UPDATE public.profiles SET kyc_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, kyc_note = _note WHERE user_id = _user_id;
  PERFORM set_config('app.compliance_rpc','off', true);
  UPDATE public.kyc_documents SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now()
    WHERE user_id=_user_id AND status='pending';
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'kyc_approved' ELSE 'kyc_rejected' END, 'profile', _user_id, jsonb_build_object('note',_note));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid,boolean,text) TO authenticated;

-- Database-level enforcement: no trading without KYC, risk acceptance, and while frozen
CREATE OR REPLACE FUNCTION public.assert_can_trade(_user uuid) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT kyc_status, risk_ack_at, is_frozen INTO p FROM public.profiles WHERE user_id = _user;
  IF p.kyc_status IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Vérification d''identité (KYC) requise avant toute opération sur titres'; END IF;
  IF p.risk_ack_at IS NULL THEN RAISE EXCEPTION 'Vous devez accepter l''avertissement de risque avant votre premier achat'; END IF;
  IF p.is_frozen THEN RAISE EXCEPTION 'Compte gelé : opérations suspendues'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_trade_on_share() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM public.assert_can_trade(NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER user_shares_trade_check BEFORE INSERT OR UPDATE ON public.user_shares FOR EACH ROW EXECUTE FUNCTION public.enforce_trade_on_share();

CREATE OR REPLACE FUNCTION public.enforce_trade_on_listing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_can_trade(NEW.seller_id);
  RETURN NEW;
END; $$;
CREATE TRIGGER p2p_listing_trade_check BEFORE INSERT ON public.p2p_listings FOR EACH ROW EXECUTE FUNCTION public.enforce_trade_on_listing();

-- Storage: private ID documents in a per-user folder
CREATE POLICY "kyc upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_utilisateurs')));