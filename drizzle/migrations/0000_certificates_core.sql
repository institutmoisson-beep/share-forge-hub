CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS risk_ack_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS transfer_rules text,
  ADD COLUMN IF NOT EXISTS requires_issuer_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_frozen boolean NOT NULL DEFAULT false;

CREATE TABLE public.certificate_secrets (id int PRIMARY KEY, secret bytea NOT NULL);
INSERT INTO public.certificate_secrets VALUES (1, extensions.gen_random_bytes(32));
ALTER TABLE public.certificate_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.certificate_secrets FROM anon, authenticated;

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_share_id uuid,
  current_owner_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  public_code text NOT NULL UNIQUE,
  qr_secret_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','listed','pending_transfer','superseded','frozen')),
  version integer NOT NULL DEFAULT 1,
  issued_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  parent_certificate_id uuid REFERENCES public.certificates(id)
);
CREATE INDEX ON public.certificates(current_owner_id);
CREATE INDEX ON public.certificates(user_share_id);
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads certificates" ON public.certificates FOR SELECT TO authenticated
  USING (current_owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.certificate_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  from_certificate_id uuid,
  to_certificate_id uuid,
  from_user_id uuid,
  to_user_id uuid,
  quantity integer NOT NULL,
  price_fcfa numeric NOT NULL DEFAULT 0,
  transfer_type text NOT NULL CHECK (transfer_type IN ('issuance','sale','admin_correction')),
  previous_hash text,
  record_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.certificate_transfers(company_id, created_at);
GRANT SELECT ON public.certificate_transfers TO authenticated;
GRANT ALL ON public.certificate_transfers TO service_role;
ALTER TABLE public.certificate_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties read transfers" ON public.certificate_transfers FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.prevent_modification() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Table % is append-only', TG_TABLE_NAME; END; $$;
CREATE TRIGGER transfers_append_only BEFORE UPDATE OR DELETE ON public.certificate_transfers FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

CREATE OR REPLACE FUNCTION public.guard_certificates() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.cert_rpc', true),'') <> 'on' THEN
    RAISE EXCEPTION 'Certificates can only be changed through platform functions';
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Certificates cannot be deleted'; END IF;
  IF OLD.status = 'superseded' THEN
    RAISE EXCEPTION 'A superseded certificate can never be reactivated';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER certificates_guard BEFORE UPDATE OR DELETE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.guard_certificates();

CREATE OR REPLACE FUNCTION public.cert_token(_cert_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT encode(extensions.hmac(convert_to(_cert_id::text,'UTF8'), secret, 'sha256'::text), 'hex') FROM public.certificate_secrets WHERE id = 1
$$;
REVOKE EXECUTE ON FUNCTION public.cert_token(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_cert_code() RETURNS text LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE c text;
BEGIN
  LOOP
    c := 'MSN-' || upper(substr(encode(extensions.gen_random_bytes(3),'hex'),1,4)) || '-' || upper(substr(encode(extensions.gen_random_bytes(3),'hex'),1,4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE public_code = c);
  END LOOP;
  RETURN c;
END; $$;

CREATE OR REPLACE FUNCTION public.compute_transfer_hash(_prev text, _from uuid, _to uuid, _qty int, _price numeric, _at timestamptz)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT encode(extensions.digest(convert_to(coalesce(_prev,'GENESIS') || '|' || coalesce(_from::text,'') || '|' || coalesce(_to::text,'') || '|' || _qty::text || '|' || trim_scale(_price)::text || '|' || extract(epoch from _at)::text, 'UTF8'), 'sha256'::text), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.issue_certificate(_company uuid, _share uuid, _owner uuid, _qty int, _price numeric, _parent uuid, _from_user uuid, _type text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE new_id uuid := gen_random_uuid(); prev text; ver int := 1; now_ts timestamptz := clock_timestamp();
BEGIN
  PERFORM set_config('app.cert_rpc','on', true);
  IF _parent IS NOT NULL THEN
    SELECT version + 1 INTO ver FROM public.certificates WHERE id = _parent FOR UPDATE;
    UPDATE public.certificates SET status='superseded', superseded_at=now_ts WHERE id=_parent AND status <> 'superseded';
  END IF;
  INSERT INTO public.certificates(id, company_id, user_share_id, current_owner_id, quantity, public_code, qr_secret_hash, version, parent_certificate_id, issued_at)
  VALUES (new_id, _company, _share, _owner, _qty, public.generate_cert_code(),
          encode(extensions.digest(convert_to(public.cert_token(new_id),'UTF8'),'sha256'::text),'hex'), coalesce(ver,1), _parent, now_ts);
  SELECT record_hash INTO prev FROM public.certificate_transfers WHERE company_id=_company ORDER BY created_at DESC, id DESC LIMIT 1;
  INSERT INTO public.certificate_transfers(company_id, from_certificate_id, to_certificate_id, from_user_id, to_user_id, quantity, price_fcfa, transfer_type, previous_hash, record_hash, created_at)
  VALUES (_company, _parent, new_id, _from_user, _owner, _qty, coalesce(_price,0), _type, prev,
          public.compute_transfer_hash(prev, _from_user, _owner, _qty, coalesce(_price,0), now_ts), now_ts);
  INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), 'certificate_issued', 'certificate', new_id, jsonb_build_object('type',_type,'quantity',_qty,'parent',_parent));
  PERFORM set_config('app.cert_rpc','off', true);
  RETURN new_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.issue_certificate(uuid,uuid,uuid,int,numeric,uuid,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_share_certificate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity > 0 THEN
      PERFORM public.issue_certificate(NEW.company_id, NEW.id, NEW.user_id, NEW.quantity, NEW.purchase_price, NULL, NULL, 'issuance');
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO cur FROM public.certificates WHERE user_share_id = OLD.id AND status <> 'superseded' ORDER BY version DESC LIMIT 1;
  IF TG_OP = 'DELETE' OR NEW.quantity <= 0 THEN
    IF cur.id IS NOT NULL THEN
      PERFORM set_config('app.cert_rpc','on', true);
      UPDATE public.certificates SET status='superseded', superseded_at=now() WHERE id=cur.id;
      PERFORM set_config('app.cert_rpc','off', true);
      INSERT INTO public.audit_log(actor_id, action, entity, entity_id, details)
      VALUES (auth.uid(),'certificate_superseded','certificate',cur.id, jsonb_build_object('reason','holding closed'));
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF NEW.quantity <> OLD.quantity OR NEW.user_id <> OLD.user_id THEN
    PERFORM public.issue_certificate(NEW.company_id, NEW.id, NEW.user_id, NEW.quantity, NEW.purchase_price, cur.id,
      CASE WHEN NEW.user_id <> OLD.user_id THEN OLD.user_id ELSE NEW.user_id END,
      CASE WHEN NEW.user_id <> OLD.user_id THEN 'sale' ELSE 'admin_correction' END);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER user_shares_certificates AFTER INSERT OR UPDATE OR DELETE ON public.user_shares FOR EACH ROW EXECUTE FUNCTION public.sync_share_certificate();

DO $$ DECLARE s record; BEGIN
  FOR s IN SELECT * FROM public.user_shares WHERE quantity > 0 ORDER BY created_at LOOP
    PERFORM public.issue_certificate(s.company_id, s.id, s.user_id, s.quantity, s.purchase_price, NULL, NULL, 'issuance');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_certificate_token(_cert_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.cert_token(id) FROM public.certificates WHERE id=_cert_id AND current_owner_id = auth.uid() AND status <> 'superseded'
$$;
GRANT EXECUTE ON FUNCTION public.get_my_certificate_token(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_certificate(_token text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE c record; comp record; p record; n int;
BEGIN
  SELECT * INTO c FROM public.certificates WHERE qr_secret_hash = encode(extensions.digest(convert_to(_token,'UTF8'),'sha256'::text),'hex');
  IF c.id IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  SELECT name, is_frozen INTO comp FROM public.companies WHERE id=c.company_id;
  SELECT first_name, last_name INTO p FROM public.profiles WHERE user_id=c.current_owner_id;
  SELECT count(*) INTO n FROM public.certificate_transfers WHERE company_id=c.company_id AND transfer_type='sale';
  RETURN jsonb_build_object('found', true, 'status', CASE WHEN c.status='superseded' THEN 'superseded' WHEN c.status='frozen' OR comp.is_frozen THEN 'frozen' ELSE 'valid' END,
    'public_code', c.public_code, 'company', comp.name, 'company_id', c.company_id, 'quantity', c.quantity, 'version', c.version,
    'issued_at', c.issued_at, 'superseded_at', c.superseded_at, 'sales_count', n,
    'holder', CASE WHEN c.status='superseded' THEN NULL ELSE left(coalesce(p.first_name,''),1) || '*** ' || left(coalesce(p.last_name,''),1) || '***' END);
END; $$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_company_transfer_history(_company_id uuid) RETURNS TABLE(created_at timestamptz, transfer_type text, quantity int, price_fcfa numeric, from_label text, to_label text, record_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.created_at, t.transfer_type, t.quantity, t.price_fcfa,
    CASE WHEN t.from_user_id IS NULL THEN 'Émission' WHEN t.from_user_id = auth.uid() THEN 'Vous' ELSE 'Détenteur #' || left(md5(t.from_user_id::text),6) END,
    CASE WHEN t.to_user_id = auth.uid() THEN 'Vous' ELSE 'Détenteur #' || left(md5(t.to_user_id::text),6) END,
    t.record_hash
  FROM public.certificate_transfers t WHERE t.company_id = _company_id ORDER BY t.created_at, t.id
$$;
GRANT EXECUTE ON FUNCTION public.get_company_transfer_history(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_chain(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; prev text := NULL; total int := 0;
BEGIN
  FOR r IN SELECT * FROM public.certificate_transfers WHERE company_id=_company_id ORDER BY created_at, id LOOP
    total := total + 1;
    IF r.previous_hash IS DISTINCT FROM prev OR r.record_hash <> public.compute_transfer_hash(r.previous_hash, r.from_user_id, r.to_user_id, r.quantity, r.price_fcfa, r.created_at) THEN
      RETURN jsonb_build_object('valid', false, 'records', total, 'broken_at', r.id);
    END IF;
    prev := r.record_hash;
  END LOOP;
  RETURN jsonb_build_object('valid', true, 'records', total);
END; $$;
GRANT EXECUTE ON FUNCTION public.verify_chain(uuid) TO anon, authenticated;