CREATE OR REPLACE FUNCTION public.purchase_listing_atomic(_listing uuid, _buyer uuid, _order text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; s record; bw record; sw record; total numeric;
BEGIN
  SELECT * INTO l FROM p2p_listings WHERE id = _listing FOR UPDATE;
  IF l IS NULL OR l.status <> 'active' THEN RAISE EXCEPTION 'Annonce déjà vendue ou indisponible.'; END IF;
  IF l.issuer_approval NOT IN ('not_required','approved') THEN RAISE EXCEPTION 'Cession non autorisée par l''émetteur.'; END IF;
  IF l.seller_id = _buyer THEN RAISE EXCEPTION 'Vous ne pouvez pas acheter votre propre annonce.'; END IF;
  PERFORM public.assert_can_trade(_buyer);
  SELECT * INTO s FROM user_shares WHERE id = l.user_share_id AND user_id = l.seller_id FOR UPDATE;
  IF s IS NULL OR s.quantity < l.quantity THEN RAISE EXCEPTION 'Le vendeur ne dispose plus du volume annoncé.'; END IF;
  total := l.price_per_share * l.quantity;
  -- lock wallets in stable order to avoid deadlocks
  PERFORM 1 FROM wallets WHERE user_id IN (_buyer, l.seller_id) ORDER BY id FOR UPDATE;
  SELECT * INTO bw FROM wallets WHERE user_id = _buyer;
  SELECT * INTO sw FROM wallets WHERE user_id = l.seller_id;
  IF bw IS NULL OR bw.balance < total THEN RAISE EXCEPTION 'Solde insuffisant pour acheter cette annonce.'; END IF;
  UPDATE p2p_listings SET status = 'sold', buyer_id = _buyer, sold_at = now() WHERE id = l.id;
  UPDATE wallets SET balance = balance - total WHERE id = bw.id;
  UPDATE wallets SET balance = balance + total WHERE id = sw.id;
  IF s.quantity - l.quantity > 0 THEN
    UPDATE user_shares SET quantity = quantity - l.quantity WHERE id = s.id;
  ELSE
    DELETE FROM user_shares WHERE id = s.id;
  END IF;
  INSERT INTO user_shares(user_id, company_id, quantity, purchase_price, order_number)
    VALUES (_buyer, l.company_id, l.quantity, l.price_per_share, _order);
  INSERT INTO wallet_transactions(wallet_id, user_id, amount, type, status, description, processed_at) VALUES
    (bw.id, _buyer, total, 'purchase', 'approved', 'Achat P2P de ' || l.quantity || ' titre(s)', now()),
    (sw.id, l.seller_id, total, 'sale', 'approved', 'Vente P2P de ' || l.quantity || ' titre(s)', now());
  RETURN jsonb_build_object('order_number', _order, 'total', total);
END $$;
REVOKE ALL ON FUNCTION public.purchase_listing_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_listing_atomic(uuid, uuid, text) TO service_role;