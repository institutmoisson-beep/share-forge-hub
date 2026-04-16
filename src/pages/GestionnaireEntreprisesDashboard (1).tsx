// GestionnaireEntreprisesDashboard.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, TrendingUp, TrendingDown, Coins, Search, Plus, BarChart3, Activity,
} from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const fmtShort = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);

const GestionnaireEntreprisesDashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");

  const { data, isLoading } = useQuery({
    queryKey: ["gest-entreprises", user?.id],
    queryFn: async () => {
      const [companiesRes, sharesRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("user_shares").select("company_id, quantity, purchase_price"),
      ]);
      const companies = companiesRes.data || [];
      const shares = sharesRes.data || [];

      const sharesByCompany = shares.reduce<Record<string, { qty: number; invested: number }>>((acc, s) => {
        if (!acc[s.company_id]) acc[s.company_id] = { qty: 0, invested: 0 };
        acc[s.company_id].qty += s.quantity;
        acc[s.company_id].invested += Number(s.purchase_price) * s.quantity;
        return acc;
      }, {});

      const enriched = companies.map(c => ({
        ...c,
        sharesData: sharesByCompany[c.id] || { qty: 0, invested: 0 },
      }));

      const sectorData = Object.entries(
        companies.reduce<Record<string, { count: number; value: number }>>((acc, c) => {
          if (!acc[c.sector]) acc[c.sector] = { count: 0, value: 0 };
          acc[c.sector].count += 1;
          acc[c.sector].value += Number(c.price_per_share) * (c.total_shares - c.available_shares);
          return acc;
        }, {})
      ).map(([sector, d]) => ({ sector: sector.slice(0, 12), count: d.count, value: d.value })).sort((a, b) => b.value - a.value).slice(0, 8);

      return { companies: enriched, sectorData };
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_active: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Statut mis à jour.");
      await queryClient.invalidateQueries({ queryKey: ["gest-entreprises"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (data?.companies || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.sector.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#030711 0%,#050d1a 50%,#030711 100%)" }}>
      <Navbar />

      <div className="pt-20 pb-4 border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="font-mono text-xs text-blue-400/60 tracking-widest mb-1">GESTION DES ENTREPRISES</p>
              <h1 className="font-mono font-bold text-xl text-white">{profile?.first_name} {profile?.last_name}</h1>
            </div>
            <div className="flex items-center gap-2">
              {[
                { l: "LISTE", k: "list" as const },
                { l: "ANALYTIQUES", k: "analytics" as const },
              ].map(({ l, k }) => (
                <button key={k} onClick={() => setActiveTab(k)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-mono tracking-widest border transition-all ${activeTab === k ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "border-transparent text-white/30 hover:text-white/60"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "ENTREPRISES TOTALES", v: data?.companies?.length || 0, sub: `${data?.companies?.filter(c => c.is_active).length || 0} actives` },
              { l: "TITRES ÉMIS", v: fmtShort((data?.companies || []).reduce((s, c) => s + (c.total_shares - c.available_shares), 0)), sub: "Tous portefeuilles" },
              { l: "TITRES DISPONIBLES", v: fmtShort((data?.companies || []).reduce((s, c) => s + c.available_shares, 0)), sub: "En vente" },
              { l: "VALEUR TOTALE", v: fmtShort((data?.companies || []).reduce((s, c) => s + Number(c.price_per_share) * (c.total_shares - c.available_shares), 0)), sub: "FCFA" },
            ].map(({ l, v, sub }) => (
              <div key={l} className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4">
                <p className="font-mono text-[10px] text-white/30 tracking-widest">{l}</p>
                <p className="font-mono font-bold text-white text-xl mt-1">{isLoading ? "..." : v}</p>
                <p className="font-mono text-[10px] text-white/20">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-5">
        {activeTab === "list" && (
          <>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
                <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 h-9 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-blue-500/30" />
              </div>
            </div>

            <div className="space-y-3">
              {filtered.map(c => {
                const sold = c.total_shares - c.available_shares;
                const pct = c.total_shares > 0 ? (sold / c.total_shares) * 100 : 0;
                const chg = Number(c.price_per_share) - Number(c.previous_price);
                const pctChg = c.previous_price > 0 ? ((chg / Number(c.previous_price)) * 100).toFixed(1) : "0";
                const up = chg >= 0;
                return (
                  <div key={c.id} className="rounded-2xl border border-white/5 p-5 hover:border-blue-500/15 transition-all" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {c.logo_url ? <img src={c.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-4 w-4 text-blue-400/50" />}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-white/90">{c.name}</p>
                          <p className="font-mono text-[10px] text-white/30">{c.sector} · {c.city}, {c.country}</p>
                          <p className="font-mono text-[10px] text-white/20">{c.registre_commerce}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-right">
                          <p className="font-mono text-[10px] text-white/30">PRIX</p>
                          <p className="font-mono font-bold text-amber-400">{Number(c.price_per_share).toLocaleString()} FCFA</p>
                          <p className={`font-mono text-[10px] ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? "+" : ""}{pctChg}%</p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] text-white/30 mb-1">PROGRESSION</p>
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-mono text-white/20 mb-1">
                              <span>{sold}/{c.total_shares}</span><span className="text-amber-400">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#3b82f6,#60a5fa)" }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/entreprises/${c.id}`} className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono hover:bg-blue-500/20 transition-all">
                            VOIR
                          </Link>
                          <button onClick={() => toggleMutation.mutate({ id: c.id, status: !c.is_active })} disabled={toggleMutation.isPending}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-mono border transition-all ${c.is_active ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"}`}>
                            {c.is_active ? "MASQUER" : "ACTIVER"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "analytics" && (
          <div className="rounded-2xl border border-white/5 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest mb-4">VALEUR INVESTIE PAR SECTEUR</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.sectorData || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)", fontFamily: "monospace" }} tickLine={false} axisLine={false} width={80} />
                <Tooltip formatter={(v: any) => [fmtShort(v) + " FCFA", "Valeur"]} contentStyle={{ background: "#0a0f1e", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, fontSize: 10, fontFamily: "monospace" }} />
                <Bar dataKey="value" fill="#3b82f6" fillOpacity={0.8} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionnaireEntreprisesDashboard;
