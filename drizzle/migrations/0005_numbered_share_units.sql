CREATE TABLE public.share_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  serial integer NOT NULL,
  unit_code text NOT NULL UNIQUE,
  current_owner_id uuid NOT NULL,
  user_share_id uuid REFERENCES public.user_shares(id) ON DELETE SET NULL,
  last_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, serial)
);
GRANT SELECT ON public.share_units TO authenticated;
GRANT ALL ON public.share_units TO service_role;
ALTER TABLE public.share_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins view units" ON public.share_units FOR SELECT TO authenticated
  USING (current_owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.is_issuer_of(auth.uid(), company_id));
CREATE INDEX share_units_owner_idx ON public.share_units(current_owner_id);
CREATE INDEX share_units_share_idx ON public.share_units(user_share_id);

CREATE TABLE public.share_unit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.share_units(id),
  from_user_id uuid,
  to_user_id uuid NOT NULL,
  price_fcfa numeric NOT NULL DEFAULT 0,
  transfer_type text NOT NULL,
  order_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.share_unit_history TO service_role;
ALTER TABLE public.share_unit_history ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER unit_history_append_only BEFORE UPDATE OR DELETE ON public.share_unit_history FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();
CREATE INDEX share_unit_history_unit_idx ON public.share_unit_history(unit_id);

CREATE TABLE public.listing_units (
  listing_id uuid NOT NULL REFERENCES public.p2p_listings(id),
  unit_id uuid NOT NULL REFERENCES public.share_units(id),
  sold boolean NOT NULL DEFAULT false,
  PRIMARY KEY (listing_id, unit_id)
);
GRANT SELECT ON public.listing_units TO authenticated;
GRANT ALL ON public.listing_units TO service_role;
ALTER TABLE public.listing_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view listing units" ON public.listing_units FOR SELECT TO authenticated USING (true);

ALTER TABLE public.p2p_listings ADD COLUMN target_buyer_id uuid, ADD COLUMN payment_mode text NOT NULL DEFAULT 'wallet';

-- create units for new holdings (primary purchases), unless units are being moved
CREATE OR REPLACE FUNCTION public.create_units_for_share() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; i int; pfx text;
BEGIN
  IF coalesce(current_setting('app.units_moving', true),'') = 'on' OR NEW.quantity <= 0 THEN RETURN NEW; END IF;
  PERFORM 1 FROM companies WHERE id = NEW.company_id FOR UPDATE;
  SELECT coalesce(max(serial),0) INTO n FROM share_units WHERE company_id = NEW.company_id;
  pfx := 'T-' || upper(left(replace(NEW.company_id::text,'-',''),4)) || '-';
  FOR i IN 1..NEW.quantity LOOP
    WITH u AS (
      INSERT INTO share_units(company_id, serial, unit_code, current_owner_id, user_share_id, last_price)
      VALUES (NEW.company_id, n+i, pfx || lpad((n+i)::text, 6, '0'), NEW.user_id, NEW.id, NEW.purchase_price) RETURNING id)
    INSERT INTO share_unit_history(unit_id, from_user_id, to_user_id, price_fcfa, transfer_type, order_number)
    SELECT id, NULL, NEW.user_id, NEW.purchase_price, 'issuance', NEW.order_number FROM u;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER user_shares_units AFTER INSERT ON public.user_shares FOR EACH ROW EXECUTE FUNCTION public.create_units_for_share();

-- listing by units (service role, called from edge function)
CREATE OR REPLACE FUNCTION public.create_unit_listing(_seller uuid, _unit_ids uuid[], _price numeric, _target_msn text, _mode text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sh uuid; comp uuid; cnt int; target uuid; lid uuid;
BEGIN
  IF _price IS NULL OR _price < 0 OR (_mode = 'wallet' AND _price <= 0) THEN RAISE EXCEPTION 'Prix invalide.'; END IF;
  IF _mode NOT IN ('wallet','external') THEN RAISE EXCEPTION 'Mode invalide.'; END IF;
  IF coalesce(array_length(_unit_ids,1),0) = 0 THEN RAISE EXCEPTION 'Sélectionnez au moins un titre.'; END IF;
  PERFORM 1 FROM share_units WHERE id = ANY(_unit_ids) FOR UPDATE;
  SELECT count(*), min(user_share_id::text)::uuid, min(company_id::text)::uuid INTO cnt, sh, comp FROM share_units WHERE id = ANY(_unit_ids) AND current_owner_id = _seller;
  IF cnt <> array_length(_unit_ids,1) THEN RAISE EXCEPTION 'Certains titres ne vous appartiennent pas.'; END IF;
  IF (SELECT count(DISTINCT user_share_id) FROM share_units WHERE id = ANY(_unit_ids)) <> 1 THEN RAISE EXCEPTION 'Sélectionnez des titres d''une même ligne.'; END IF;
  IF EXISTS (SELECT 1 FROM listing_units lu JOIN p2p_listings l ON l.id = lu.listing_id WHERE lu.unit_id = ANY(_unit_ids) AND NOT lu.sold AND l.status='active') THEN
    RAISE EXCEPTION 'Certains titres sont déjà en vente.'; END IF;
  IF nullif(trim(_target_msn),'') IS NOT NULL THEN
    SELECT user_id INTO target FROM profiles WHERE msn_id = upper(trim(_target_msn));
    IF target IS NULL THEN RAISE EXCEPTION 'Identifiant MSN du destinataire introuvable.'; END IF;
    IF target = _seller THEN RAISE EXCEPTION 'Destinataire invalide.'; END IF;
  ELSIF _mode = 'external' THEN RAISE EXCEPTION 'Une cession directe exige un destinataire.';
  END IF;
  INSERT INTO p2p_listings(seller_id, user_share_id, company_id, quantity, price_per_share, target_buyer_id, payment_mode)
  VALUES (_seller, sh, comp, cnt, _price, target, _mode) RETURNING id INTO lid;
  INSERT INTO listing_units(listing_id, unit_id) SELECT lid, unnest(_unit_ids);
  RETURN lid;
END $$;

-- buy chosen units of a listing (service role)
CREATE OR REPLACE FUNCTION public.buy_listing_units(_listing uuid, _buyer uuid, _unit_ids uuid[], _order text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; s record; bw record; sw record; k int; total numeric; new_share uuid; codes text[];
BEGIN
  SELECT * INTO l FROM p2p_listings WHERE id = _listing FOR UPDATE;
  IF l IS NULL OR l.status <> 'active' THEN RAISE EXCEPTION 'Annonce déjà vendue ou indisponible.'; END IF;
  IF l.issuer_approval NOT IN ('not_required','approved') THEN RAISE EXCEPTION 'Cession non autorisée par l''émetteur.'; END IF;
  IF l.seller_id = _buyer THEN RAISE EXCEPTION 'Vous ne pouvez pas acheter votre propre annonce.'; END IF;
  IF l.target_buyer_id IS NOT NULL AND l.target_buyer_id <> _buyer THEN RAISE EXCEPTION 'Cette offre est réservée à un autre membre.'; END IF;
  IF coalesce(array_length(_unit_ids,1),0) = 0 THEN RAISE EXCEPTION 'Sélectionnez au moins un titre.'; END IF;
  PERFORM public.assert_can_trade(_buyer);
  PERFORM 1 FROM listing_units WHERE listing_id = l.id AND unit_id = ANY(_unit_ids) FOR UPDATE;
  SELECT count(*) INTO k FROM listing_units lu JOIN share_units u ON u.id = lu.unit_id
    WHERE lu.listing_id = l.id AND lu.unit_id = ANY(_unit_ids) AND NOT lu.sold AND u.current_owner_id = l.seller_id;
  IF k <> array_length(_unit_ids,1) THEN RAISE EXCEPTION 'Un ou plusieurs titres choisis ne sont plus disponibles.'; END IF;
  SELECT * INTO s FROM user_shares WHERE id = l.user_share_id AND user_id = l.seller_id FOR UPDATE;
  IF s IS NULL OR s.quantity < k THEN RAISE EXCEPTION 'Le vendeur ne dispose plus de ces titres.'; END IF;
  total := l.price_per_share * k;
  IF l.payment_mode = 'wallet' THEN
    PERFORM 1 FROM wallets WHERE user_id IN (_buyer, l.seller_id) ORDER BY id FOR UPDATE;
    SELECT * INTO bw FROM wallets WHERE user_id = _buyer;
    SELECT * INTO sw FROM wallets WHERE user_id = l.seller_id;
    IF bw IS NULL OR bw.balance < total THEN RAISE EXCEPTION 'Solde insuffisant (% FCFA requis).', total; END IF;
    UPDATE wallets SET balance = balance - total WHERE id = bw.id;
    UPDATE wallets SET balance = balance + total WHERE id = sw.id;
  END IF;
  PERFORM set_config('app.units_moving','on', true);
  INSERT INTO user_shares(user_id, company_id, quantity, purchase_price, order_number)
    VALUES (_buyer, l.company_id, k, l.price_per_share, _order) RETURNING id INTO new_share;
  PERFORM set_config('app.units_moving','off', true);
  UPDATE share_units SET current_owner_id = _buyer, user_share_id = new_share, last_price = l.price_per_share WHERE id = ANY(_unit_ids);
  INSERT INTO share_unit_history(unit_id, from_user_id, to_user_id, price_fcfa, transfer_type, order_number)
    SELECT unnest(_unit_ids), l.seller_id, _buyer, l.price_per_share,
      CASE WHEN l.payment_mode='external' THEN 'direct' WHEN l.target_buyer_id IS NOT NULL THEN 'otc' ELSE 'market' END, _order;
  UPDATE listing_units SET sold = true WHERE listing_id = l.id AND unit_id = ANY(_unit_ids);
  IF s.quantity - k > 0 THEN UPDATE user_shares SET quantity = quantity - k WHERE id = s.id;
  ELSE DELETE FROM user_shares WHERE id = s.id; END IF;
  IF EXISTS (SELECT 1 FROM listing_units WHERE listing_id = l.id AND NOT sold) THEN
    UPDATE p2p_listings SET quantity = quantity - k WHERE id = l.id;
  ELSE
    UPDATE p2p_listings SET status = 'sold', buyer_id = _buyer, sold_at = now(), quantity = k WHERE id = l.id;
  END IF;
  IF l.payment_mode = 'wallet' THEN
    INSERT INTO wallet_transactions(wallet_id, user_id, amount, type, status, description, processed_at) VALUES
      (bw.id, _buyer, total, 'purchase', 'approved', 'Achat de ' || k || ' titre(s) · ' || _order, now()),
      (sw.id, l.seller_id, total, 'sale', 'approved', 'Vente de ' || k || ' titre(s) · ' || _order, now());
  END IF;
  SELECT array_agg(unit_code ORDER BY serial) INTO codes FROM share_units WHERE id = ANY(_unit_ids);
  RETURN jsonb_build_object('order_number', _order, 'total', total, 'quantity', k, 'unit_codes', to_jsonb(codes), 'payment_mode', l.payment_mode);
END $$;

REVOKE ALL ON FUNCTION public.create_unit_listing(uuid, uuid[], numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.buy_listing_units(uuid, uuid, uuid[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_unit_listing(uuid, uuid[], numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.buy_listing_units(uuid, uuid, uuid[], text) TO service_role;

-- history of a unit, masked names
CREATE OR REPLACE FUNCTION public.get_unit_history(_unit uuid)
RETURNS TABLE(created_at timestamptz, transfer_type text, price_fcfa numeric, from_label text, to_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.created_at, h.transfer_type, h.price_fcfa,
    CASE WHEN h.from_user_id IS NULL THEN 'Émission' WHEN h.from_user_id = auth.uid() THEN 'Vous' ELSE left(coalesce(pf.first_name,''),1) || '*** ' || left(coalesce(pf.last_name,''),1) || '*** (' || right(pf.msn_id,3) || ')' END,
    CASE WHEN h.to_user_id = auth.uid() THEN 'Vous' ELSE left(coalesce(pt.first_name,''),1) || '*** ' || left(coalesce(pt.last_name,''),1) || '*** (' || right(pt.msn_id,3) || ')' END
  FROM share_unit_history h
  LEFT JOIN profiles pf ON pf.user_id = h.from_user_id
  LEFT JOIN profiles pt ON pt.user_id = h.to_user_id
  WHERE h.unit_id = _unit AND auth.uid() IS NOT NULL
  ORDER BY h.created_at
$$;
REVOKE ALL ON FUNCTION public.get_unit_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unit_history(uuid) TO authenticated;

-- units offered in a listing (codes visible to buyers)
CREATE OR REPLACE FUNCTION public.get_listing_units(_listing uuid)
RETURNS TABLE(unit_id uuid, unit_code text, serial integer, last_price numeric, transfers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.unit_code, u.serial, u.last_price, (SELECT count(*) FROM share_unit_history h WHERE h.unit_id = u.id) - 1
  FROM listing_units lu JOIN share_units u ON u.id = lu.unit_id JOIN p2p_listings l ON l.id = lu.listing_id
  WHERE lu.listing_id = _listing AND NOT lu.sold AND auth.uid() IS NOT NULL
    AND (l.target_buyer_id IS NULL OR l.target_buyer_id = auth.uid() OR l.seller_id = auth.uid())
  ORDER BY u.serial
$$;
REVOKE ALL ON FUNCTION public.get_listing_units(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listing_units(uuid) TO authenticated;