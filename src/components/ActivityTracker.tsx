import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const sessionId = (() => {
  let s = sessionStorage.getItem("msn_sid");
  if (!s) { s = crypto.randomUUID(); sessionStorage.setItem("msn_sid", s); }
  return s;
})();

const log = (event: string, path: string, userId?: string) =>
  supabase.from("activity_events").insert({
    event, path: path.slice(0, 290), session_id: sessionId,
    user_id: userId ?? null, user_agent: navigator.userAgent.slice(0, 200),
  }).then(() => {});

const ActivityTracker = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  useEffect(() => { log("page_view", pathname, user?.id); }, [pathname, user?.id]);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) log("heartbeat", location.pathname, user?.id); }, 60000);
    return () => clearInterval(t);
  }, [user?.id]);
  return null;
};
export default ActivityTracker;
