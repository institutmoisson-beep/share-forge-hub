CREATE TABLE public.platform_settings (
  id int PRIMARY KEY CHECK (id = 1),
  max_tx_amount numeric NOT NULL DEFAULT 5000000,
  max_30d_amount numeric NOT NULL DEFAULT 20000000,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_settings(id) VALUES (1);
GRANT SELECT ON public.platform_settings TO authenticated, anon;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.platform_settings FOR SELECT TO authenticated, anon USING (true);

CREATE OR REPLACE FUNCTION public.admin_update_limits(_max_tx numeric, _max_30d numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _max_tx <= 0 OR _max_30d <= 0 THEN RAISE EXCEPTION 'Les plafonds doivent être positifs'; END IF;
  UPDATE public.platform_settings SET max_tx_amount=_max_tx, max_30d_amount=_max_30d, updated_by=auth.uid(), updated_at=now() WHERE id=1;
  INSERT INTO public.audit_log(actor_id, action, entity, details) VALUES (auth.uid(),'limits_updated','settings', jsonb_build_object('max_tx',_max_tx,'max_30d',_max_30d));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_update_limits(numeric,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_frozen(_entity text, _id uuid, _frozen boolean, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _entity = 'user' THEN
    PERFORM set_config('app.compliance_rpc','on', true);
    UPDATE public.profiles SET is_frozen=_frozen WHERE user_id=_id;
    PERFORM set_config('app.compliance_rpc','off', true);
  ELSIF _entity = 'company' THEN
    UPDATE public.companies SET is_frozen=_frozen WHERE id=_id;
  ELSIF _entity = 'certificate' THEN
    PERFORM set_config('app.cert_rpc','on', true);
    UPDATE public.certificates SET status = CASE WHEN _frozen THEN 'frozen' ELSE 'active' END WHERE id=_id AND status IN ('active','frozen');
    PERFORM set_config('app.cert_rpc','off', true);
  ELSE RAISE EXCEPTION 'Type inconnu'; END IF;
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), CASE WHEN _frozen THEN 'frozen' ELSE 'unfrozen' END, _entity, _id, jsonb_build_object('reason',_reason));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_frozen(text,uuid,boolean,text) TO authenticated;

-- Stronger trade checks: limits, frozen company, frozen certificate
CREATE OR REPLACE FUNCTION public.enforce_trade_on_share() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st record; amount numeric; used numeric;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM public.assert_can_trade(NEW.user_id);
    IF EXISTS (SELECT 1 FROM public.companies WHERE id=NEW.company_id AND is_frozen) THEN
      RAISE EXCEPTION 'Les titres de cet émetteur sont gelés';
    END IF;
    SELECT * INTO st FROM public.platform_settings WHERE id=1;
    amount := NEW.quantity * NEW.purchase_price;
    IF amount > st.max_tx_amount THEN
      RAISE EXCEPTION 'Montant supérieur au plafond par opération (% FCFA)', st.max_tx_amount;
    END IF;
    SELECT coalesce(sum(quantity * price_fcfa),0) INTO used FROM public.certificate_transfers
      WHERE to_user_id = NEW.user_id AND transfer_type IN ('issuance','sale') AND created_at > now() - interval '30 days';
    IF used + amount > st.max_30d_amount THEN
      RAISE EXCEPTION 'Plafond sur 30 jours atteint (% FCFA)', st.max_30d_amount;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.certificates WHERE user_share_id = OLD.id AND status='frozen') THEN
    RAISE EXCEPTION 'Ce certificat est gelé';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_trade_on_listing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_can_trade(NEW.seller_id);
  IF EXISTS (SELECT 1 FROM public.certificates WHERE user_share_id = NEW.user_share_id AND status='frozen') THEN
    RAISE EXCEPTION 'Ce certificat est gelé';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_audit_log(_limit int DEFAULT 200)
RETURNS TABLE(created_at timestamptz, actor text, action text, entity text, entity_id uuid, details jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT a.created_at, coalesce(p.msn_id, 'système'), a.action, a.entity, a.entity_id, a.details
    FROM public.audit_log a LEFT JOIN public.profiles p ON p.user_id = a.actor_id
    ORDER BY a.created_at DESC LIMIT least(greatest(_limit,1),1000);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_audit_log(int) TO authenticated;