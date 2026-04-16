import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { ArrowUpRight, Award, BarChart2, Briefcase, Building2, ChevronRight, Coins, DollarSign, Eye, Globe, ListChecks, Target, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const fmtCurrency = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA";
const fmtShort = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

const CourtierDashboard = () => {
  const { user, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["courtier-dashboard", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      const [companiesRes, allSharesRes, transRes, objectivesRes] = await Promise.all([
        supabase.from("companies").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("user_shares").select("*, companies(name, price_per_share, sector)").order("purchase_date", { ascending: false }).limit(200),
        supabase.from("wallet_transactions").select("*").eq("type", "purchase").eq("status", "approved").order("created_at", { ascending: false }).limit(100),
        supabase.from("broker_objectives").select("*, companies(name)").eq("broker_id", user!.id),
      ]);

      const companies = companiesRes.data || [];
      const allShares = allSharesRes.data || [];
      const transactions = transRes.data || [];
      const objectives = objectivesRes.data || [];

      // Per-company sales stats
      const companyStats = companies.map(c => {
        const cShares = allShares.filter(s => s.company_id === c.id);
        const cTx = transactions.filter(t => t.description?.includes(c.name));
        const totalSold = c.total_shares - c.available_shares;
        const revenue = totalSold * Number(c.price_per_share);
        return { ...c, totalSold, investors: new Set(cShares.map(s => s.user_id)).size, revenue };
      }).sort((a, b) => b.revenue - a.revenue);

      // Monthly activity (last 6 months)
      const now = new Date();
      const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now); d.setMonth(d.getMonth() - (5 - i));
        const month = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
        const mKey = d.toISOString().slice(0, 7);
        const mTx = transactions.filter(t => t.created_at.slice(0, 7) === mKey);
        return { month, transactions: mTx.length, volume: mTx.reduce((s, t) => s + Number(t.amount), 0) };
      });

      return { companies, companyStats, allShares, transactions, objectives, monthlyData,
        stats: {
          totalCompanies: companies.length,
          totalInvestors: new Set(allShares.map(s => s.user_id)).size,
          totalVolume: transactions.reduce((s, t) => s + Number(t.amount), 0),
          totalShares: allShares.reduce((s, sh) => s + sh.quantity, 0),
        }
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
      </div>
    );
  }

  const s = data?.stats;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/10 mb-6">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Briefcase className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-2xl text-foreground">Espace Courtier</h1>
                  <p className="text-sm text-amber-400/80">{profile?.first_name} {profile?.last_name} · {profile?.msn_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />Courtier Actif
                </div>
                <Link to="/entreprises"><Button variant="gold" size="sm" className="text-xs"><Globe className="h-3.5 w-3.5 mr-1.5" />Voir les entreprises</Button></Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Volume total", value: fmtShort(s?.totalVolume || 0) + " FCFA", sub: "Toutes transactions", icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Investisseurs actifs", value: s?.totalInvestors || 0, sub: "Membres ayant investi", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Titres émis", value: fmtShort(s?.totalShares || 0), sub: "Participations", icon: Coins, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Entreprises", value: s?.totalCompanies || 0, sub: "Portefeuille actif", icon: Building2, color: "text-purple-400", bg: "bg-purple-500/10" },
            ].map((kpi, i) => (
              <div key={i} className="glass-card p-5 hover:border-amber-500/20 transition-all group">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <p className="font-heading font-bold text-2xl text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/60">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-heading font-semibold text-foreground mb-1">Volume mensuel</h3>
              <p className="text-xs text-muted-foreground mb-4">Transactions des 6 derniers mois</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.monthlyData || []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => fmtCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="volume" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-heading font-semibold text-foreground mb-1">Top entreprises par revenus</h3>
              <p className="text-xs text-muted-foreground mb-4">Valeur des titres vendus</p>
              <div className="space-y-3">
                {(data?.companyStats || []).slice(0, 5).map((c, i) => {
                  const pct = c.total_shares > 0 ? (c.totalSold / c.total_shares) * 100 : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: COLORS[i] + "20", color: COLORS[i] }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1"><span className="text-foreground font-medium truncate">{c.name}</span><span className="text-muted-foreground ml-2 flex-shrink-0">{pct.toFixed(0)}%</span></div>
                        <div className="h-1.5 bg-secondary rounded-full"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i] }} /></div>
                      </div>
                      <div className="text-xs text-right flex-shrink-0"><p className="font-bold text-foreground">{fmtShort(c.revenue)} FCFA</p><p className="text-muted-foreground">{c.investors} inv.</p></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Companies Portfolio */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <h2 className="font-heading font-semibold text-foreground">Portefeuille d'entreprises</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Toutes les entreprises sous gestion</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Entreprise</TableHead>
                    <TableHead className="text-xs">Secteur</TableHead>
                    <TableHead className="text-xs">Prix / Titre</TableHead>
                    <TableHead className="text-xs">Vendus</TableHead>
                    <TableHead className="text-xs">Investisseurs</TableHead>
                    <TableHead className="text-xs">Valeur vendue</TableHead>
                    <TableHead className="text-xs">Progression</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.companyStats || []).map(company => {
                    const pct = company.total_shares > 0 ? (company.totalSold / company.total_shares) * 100 : 0;
                    return (
                      <TableRow key={company.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {company.logo_url ? <img src={company.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-4 w-4 text-primary" />}
                            </div>
                            <div><p className="text-xs font-medium text-foreground">{company.name}</p><p className="text-[10px] text-muted-foreground">{company.city}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{company.sector}</span></TableCell>
                        <TableCell className="font-heading font-bold text-amber-400 text-sm">{Number(company.price_per_share).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-foreground font-medium">{company.totalSold}/{company.total_shares}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-foreground"><Users className="h-3 w-3 text-muted-foreground" />{company.investors}</div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground">{fmtShort(company.revenue)} FCFA</TableCell>
                        <TableCell>
                          <div className="w-20">
                            <div className="h-1.5 bg-secondary rounded-full"><div className="h-full bg-gradient-gold rounded-full" style={{ width: `${pct}%` }} /></div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/entreprises/${company.id}`}><Button variant="outline" size="sm" className="h-7 text-xs"><Eye className="h-3 w-3 mr-1" />Voir</Button></Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Objectives */}
          {(data?.objectives || []).length > 0 && (
            <div className="glass-card p-6">
              <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-amber-400" />Objectifs assignés</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data?.objectives || []).map(obj => {
                  const progress = obj.target_quantity > 0 ? Math.min(100, 0) : 0;
                  return (
                    <div key={obj.id} className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                      <div className="flex items-start justify-between mb-2">
                        <div><p className="text-sm font-medium text-foreground">{(obj.companies as any)?.name || "Objectif général"}</p><p className="text-xs text-muted-foreground">{obj.description}</p></div>
                        <Badge variant={obj.is_completed ? "default" : "secondary"} className="text-[10px]">{obj.is_completed ? "✓ Atteint" : "En cours"}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                        {obj.target_quantity > 0 && <span>Titres: <span className="text-foreground font-medium">{obj.target_quantity}</span></span>}
                        {Number(obj.target_amount) > 0 && <span>Montant: <span className="text-foreground font-medium">{fmtShort(Number(obj.target_amount))} FCFA</span></span>}
                        {obj.deadline && <span>Échéance: <span className="text-foreground font-medium">{new Date(obj.deadline).toLocaleDateString("fr-FR")}</span></span>}
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full"><div className="h-full bg-gradient-gold rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourtierDashboard;
