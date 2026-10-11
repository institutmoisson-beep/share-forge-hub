CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_issuer_of(_user uuid, _company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE user_id=_user AND company_id=_company)
$$;

CREATE OR REPLACE FUNCTION public.admin_set_issuer_member(_company uuid, _msn_id text, _add boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT user_id INTO uid FROM public.profiles WHERE msn_id = upper(trim(_msn_id));
  IF uid IS NULL THEN RAISE EXCEPTION 'Identifiant MSN introuvable'; END IF;
  IF _add THEN
    INSERT INTO public.company_members(company_id, user_id, created_by) VALUES (_company, uid, auth.uid()) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.company_members WHERE company_id=_company AND user_id=uid;
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), CASE WHEN _add THEN 'issuer_member_added' ELSE 'issuer_member_removed' END, 'company', _company, jsonb_build_object('user',uid));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_issuer_member(uuid,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_company_members(_company uuid) RETURNS TABLE(msn_id text, first_name text, last_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.msn_id, p.first_name, p.last_name FROM public.company_members m JOIN public.profiles p ON p.user_id=m.user_id
  WHERE m.company_id=_company AND public.has_role(auth.uid(),'admin')
$$;
GRANT EXECUTE ON FUNCTION public.get_company_members(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_issuer_register(_company uuid)
RETURNS TABLE(public_code text, msn_id text, holder_name text, phone text, quantity int, status text, version int, issued_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_issuer_of(auth.uid(), _company)) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT c.public_code, p.msn_id, trim(p.first_name || ' ' || p.last_name), p.phone, c.quantity, c.status, c.version, c.issued_at
    FROM public.certificates c LEFT JOIN public.profiles p ON p.user_id = c.current_owner_id
    WHERE c.company_id = _company AND c.status <> 'superseded' ORDER BY c.issued_at;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_issuer_register(uuid) TO authenticated;

-- Issuer pre-approval of resales
ALTER TABLE public.p2p_listings ADD COLUMN IF NOT EXISTS issuer_approval text NOT NULL DEFAULT 'not_required'
  CHECK (issuer_approval IN ('not_required','pending','approved','rejected'));
ALTER TABLE public.p2p_listings ADD COLUMN IF NOT EXISTS issuer_note text;

CREATE OR REPLACE FUNCTION public.listing_issuer_rules() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req boolean; frozen boolean;
BEGIN
  SELECT requires_issuer_approval, is_frozen INTO req, frozen FROM public.companies WHERE id = NEW.company_id;
  IF TG_OP = 'INSERT' THEN
    IF frozen THEN RAISE EXCEPTION 'Les titres de cet émetteur sont gelés'; END IF;
    NEW.issuer_approval := CASE WHEN req THEN 'pending' ELSE 'not_required' END;
    RETURN NEW;
  END IF;
  IF NEW.status = 'sold' AND OLD.status <> 'sold' THEN
    IF frozen THEN RAISE EXCEPTION 'Les titres de cet émetteur sont gelés'; END IF;
    IF NEW.issuer_approval NOT IN ('not_required','approved') THEN RAISE EXCEPTION 'Cette cession attend l''accord de l''émetteur'; END IF;
  END IF;
  IF NEW.issuer_approval IS DISTINCT FROM OLD.issuer_approval AND coalesce(current_setting('app.issuer_rpc', true),'') <> 'on' AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Seul l''émetteur peut statuer sur cette cession';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER p2p_listing_issuer_rules BEFORE INSERT OR UPDATE ON public.p2p_listings FOR EACH ROW EXECUTE FUNCTION public.listing_issuer_rules();

CREATE OR REPLACE FUNCTION public.issuer_review_listing(_listing uuid, _approve boolean, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE comp uuid;
BEGIN
  SELECT company_id INTO comp FROM public.p2p_listings WHERE id=_listing AND issuer_approval='pending' FOR UPDATE;
  IF comp IS NULL THEN RAISE EXCEPTION 'Annonce introuvable ou déjà traitée'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_issuer_of(auth.uid(), comp)) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  PERFORM set_config('app.issuer_rpc','on', true);
  UPDATE public.p2p_listings SET issuer_approval = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, issuer_note=_note,
    status = CASE WHEN _approve THEN status ELSE 'cancelled' END WHERE id=_listing;
  PERFORM set_config('app.issuer_rpc','off', true);
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'issuer_approved_listing' ELSE 'issuer_rejected_listing' END, 'listing', _listing, jsonb_build_object('note',_note));
END; $$;
GRANT EXECUTE ON FUNCTION public.issuer_review_listing(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_issuer_pending_listings(_company uuid)
RETURNS TABLE(id uuid, seller_msn text, quantity int, price_per_share numeric, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_issuer_of(auth.uid(), _company)) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT l.id, p.msn_id, l.quantity, l.price_per_share, l.created_at FROM public.p2p_listings l
    LEFT JOIN public.profiles p ON p.user_id=l.seller_id
    WHERE l.company_id=_company AND l.issuer_approval='pending' AND l.status='active' ORDER BY l.created_at;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_issuer_pending_listings(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.issuer_update_rules(_company uuid, _requires boolean, _rules text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_issuer_of(auth.uid(), _company)) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.companies SET requires_issuer_approval=_requires, transfer_rules=left(_rules, 2000) WHERE id=_company;
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details) VALUES (auth.uid(),'issuer_rules_updated','company',_company, jsonb_build_object('requires',_requires));
END; $$;
GRANT EXECUTE ON FUNCTION public.issuer_update_rules(uuid,boolean,text) TO authenticated;