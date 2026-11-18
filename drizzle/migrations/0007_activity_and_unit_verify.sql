CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  event text NOT NULL DEFAULT 'page_view',
  path text NOT NULL DEFAULT '/',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_events_created_idx ON public.activity_events(created_at DESC);
CREATE INDEX activity_events_user_idx ON public.activity_events(user_id, created_at DESC);
GRANT INSERT ON public.activity_events TO anon, authenticated;
GRANT SELECT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log own activity" ON public.activity_events FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(path) < 300 AND length(event) < 50);
CREATE POLICY "admin reads activity" ON public.activity_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_activity_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT jsonb_build_object(
    'live_sessions', (SELECT count(DISTINCT session_id) FROM activity_events WHERE created_at > now() - interval '2 minutes'),
    'live_users', (SELECT count(DISTINCT user_id) FROM activity_events WHERE user_id IS NOT NULL AND created_at > now() - interval '2 minutes'),
    'day', (SELECT count(DISTINCT user_id) FROM activity_events WHERE user_id IS NOT NULL AND created_at > now() - interval '1 day'),
    'week', (SELECT count(DISTINCT user_id) FROM activity_events WHERE user_id IS NOT NULL AND created_at > now() - interval '7 days'),
    'month', (SELECT count(DISTINCT user_id) FROM activity_events WHERE user_id IS NOT NULL AND created_at > now() - interval '30 days'),
    'visitors_day', (SELECT count(DISTINCT session_id) FROM activity_events WHERE created_at > now() - interval '1 day'),
    'views_day', (SELECT count(*) FROM activity_events WHERE event='page_view' AND created_at > now() - interval '1 day'),
    'top_pages', (SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT path, count(*) AS views FROM activity_events WHERE event='page_view' AND created_at > now() - interval '7 days' GROUP BY path ORDER BY 2 DESC LIMIT 10) t),
    'daily', (SELECT coalesce(jsonb_agg(t ORDER BY t.day),'[]') FROM (SELECT date_trunc('day', created_at)::date AS day, count(DISTINCT coalesce(user_id::text, session_id)) AS visitors, count(*) FILTER (WHERE event='page_view') AS views FROM activity_events WHERE created_at > now() - interval '30 days' GROUP BY 1) t),
    'live', (SELECT coalesce(jsonb_agg(t),'[]') FROM (
      SELECT DISTINCT ON (e.session_id) e.session_id, e.user_id, e.path, e.created_at, p.msn_id, p.first_name, p.last_name
      FROM activity_events e LEFT JOIN profiles p ON p.user_id = e.user_id
      WHERE e.created_at > now() - interval '2 minutes' ORDER BY e.session_id, e.created_at DESC) t),
    'recent', (SELECT coalesce(jsonb_agg(t),'[]') FROM (
      SELECT e.created_at, e.event, e.path, e.user_id, p.msn_id, p.first_name, p.last_name
      FROM activity_events e LEFT JOIN profiles p ON p.user_id = e.user_id
      WHERE e.event <> 'heartbeat' ORDER BY e.created_at DESC LIMIT 100) t)
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_activity_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_activity_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_unit(_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u record; h jsonb; holder text;
BEGIN
  SELECT su.*, c.name AS company, c.is_frozen AS company_frozen INTO u
  FROM share_units su JOIN companies c ON c.id = su.company_id
  WHERE upper(su.unit_code) = upper(trim(_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  SELECT CASE WHEN p.msn_id IS NULL THEN '—' ELSE left(p.first_name,1) || '*** ' || left(p.last_name,1) || '*** (' || left(p.msn_id,7) || '****)' END
    INTO holder FROM profiles p WHERE p.user_id = u.current_owner_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object('at', created_at, 'type', transfer_type, 'price', price_fcfa) ORDER BY created_at),'[]')
    INTO h FROM share_unit_history WHERE unit_id = u.id;
  RETURN jsonb_build_object('found', true, 'unit_code', u.unit_code, 'serial', u.serial, 'company', u.company,
    'status', CASE WHEN u.company_frozen THEN 'frozen' ELSE 'valid' END,
    'last_price', u.last_price, 'issued_at', u.created_at, 'holder', coalesce(holder,'—'), 'history', h);
END $$;
GRANT EXECUTE ON FUNCTION public.verify_unit(text) TO anon, authenticated;