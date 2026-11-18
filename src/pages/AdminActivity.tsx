import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, Users, Eye, Radio } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Person = { user_id: string | null; msn_id?: string; first_name?: string; last_name?: string };
type Stats = {
  live_sessions: number; live_users: number; day: number; week: number; month: number; visitors_day: number; views_day: number;
  top_pages: { path: string; views: number }[]; daily: { day: string; visitors: number; views: number }[];
  live: (Person & { session_id: string; path: string; created_at: string })[];
  recent: (Person & { created_at: string; event: string; path: string })[];
};
const who = (p: Person) => p.user_id ? `${p.first_name ?? ""} ${p.last_name ?? ""} (${p.msn_id ?? "—"})` : "Visiteur anonyme";

const AdminActivity = () => {
  const { hasRole, loading } = useAuth();
  const isAdmin = hasRole("admin");
  const { data } = useQuery({
    queryKey: ["admin-activity"], enabled: isAdmin, refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_activity_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  if (!loading && !isAdmin) return <div className="min-h-screen bg-background"><Navbar /><p className="pt-24 text-center text-muted-foreground">Accès réservé à l'administrateur.</p></div>;
  const cards = [
    { l: "En ligne maintenant", v: data?.live_sessions, s: `${data?.live_users ?? 0} membre(s) connecté(s)`, I: Radio },
    { l: "Membres aujourd'hui", v: data?.day, s: `${data?.visitors_day ?? 0} visiteurs`, I: Users },
    { l: "Membres cette semaine", v: data?.week, I: Users },
    { l: "Membres ce mois", v: data?.month, s: `${data?.views_day ?? 0} pages vues aujourd'hui`, I: Eye },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-heading text-3xl font-bold text-gradient-gold flex items-center gap-2"><Activity />Activité en direct</h1>
          <Link to="/admin" className="text-sm text-primary">← Administration</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.l} className="glass-card p-4">
              <c.I className="h-5 w-5 text-primary mb-2" />
              <div className="text-3xl font-bold text-foreground">{c.v ?? "…"}</div>
              <div className="text-sm text-muted-foreground">{c.l}</div>
              {c.s && <div className="text-xs text-muted-foreground mt-1">{c.s}</div>}
            </div>
          ))}
        </div>
        <div className="glass-card p-4">
          <h2 className="font-semibold mb-3">Visiteurs sur 30 jours</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area dataKey="visitors" name="Visiteurs" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.25)" />
                <Area dataKey="views" name="Pages vues" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-4 overflow-x-auto">
            <h2 className="font-semibold mb-3">Connectés en direct ({data?.live.length ?? 0})</h2>
            <Table><TableHeader><TableRow><TableHead>Qui</TableHead><TableHead>Page</TableHead><TableHead>Vu</TableHead></TableRow></TableHeader>
              <TableBody>{data?.live.map((l) => (
                <TableRow key={l.session_id}><TableCell>{who(l)}</TableCell><TableCell>{l.path}</TableCell><TableCell>{new Date(l.created_at).toLocaleTimeString("fr")}</TableCell></TableRow>
              ))}</TableBody></Table>
          </div>
          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Pages les plus vues (7 jours)</h2>
            <ul className="space-y-1 text-sm">{data?.top_pages.map((p) => (
              <li key={p.path} className="flex justify-between border-b border-border pb-1"><span>{p.path}</span><span className="font-medium">{p.views}</span></li>
            ))}</ul>
          </div>
        </div>
        <div className="glass-card p-4 overflow-x-auto">
          <h2 className="font-semibold mb-3">Dernières actions</h2>
          <Table><TableHeader><TableRow><TableHead>Heure</TableHead><TableHead>Qui</TableHead><TableHead>Action</TableHead><TableHead>Page</TableHead></TableRow></TableHeader>
            <TableBody>{data?.recent.map((r, i) => (
              <TableRow key={i}><TableCell>{new Date(r.created_at).toLocaleString("fr")}</TableCell><TableCell>{who(r)}</TableCell><TableCell>{r.event === "page_view" ? "Page visitée" : r.event}</TableCell><TableCell>{r.path}</TableCell></TableRow>
            ))}</TableBody></Table>
        </div>
      </div>
    </div>
  );
};
export default AdminActivity;
