import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Activity, Bell, Building2, Clock, Coins, DollarSign, MessageSquare, Search, Shield, TrendingUp, Users, UserCog, FileText, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useState } from "react";

const fmtShort = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);
const fmtCurrency = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; desc: string }> = {
  moderateur: { label: "Modérateur", icon: Shield, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", desc: "Supervision des contenus et activités de la plateforme" },
  consultant: { label: "Consultant", icon: FileText, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20", desc: "Analyse et conseil stratégique pour les entreprises partenaires" },
  comptable: { label: "Comptable", icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", desc: "Gestion comptable et suivi financier de la plateforme" },
  informaticien: { label: "Informaticien", icon: Settings, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", desc: "Maintenance technique et support de la plateforme" },
  communication: { label: "Communication", icon: MessageSquare, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20", desc: "Gestion des communications et relations avec les membres" },
  gestionnaire_achats: { label: "Gest. Achats", icon: Activity, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", desc: "Supervision des transactions d'achat sur la plateforme" },
  gestionnaire_utilisateurs: { label: "Gest. Utilisateurs", icon: UserCog, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", desc: "Gestion des comptes membres et des accès" },
};

const GenericRoleDashboard = ({ role }: { role: string }) => {
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const config = ROLE_CONFIG[role] || { label: role, icon: Shield, color: "text-muted-foreground", bg: "bg-secondary border-border", desc: "Espace de travail" };
  const Icon = config.icon;

  const { data, isLoading } = useQuery({
    queryKey: ["generic-role-dash", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      const showUsers = ["gestionnaire_utilisateurs", "moderateur"].includes(role);
      const showFinance = ["comptable", "gestionnaire_achats", "consultant"].includes(role);
      const showCompanies = ["consultant", "communication", "informaticien"].includes(role);

      const [profilesRes, companiesRes, txRes, sharesRes] = await Promise.all([
        showUsers ? supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
        showCompanies ? supabase.from("companies").select("*").eq("is_active", true).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        showFinance ? supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
        supabase.from("user_shares").select("*, companies(name)").order("purchase_date", { ascending: false }).limit(50),
      ]);

      const profiles = (profilesRes as any).data || [];
      const companies = (companiesRes as any).data || [];
      const transactions = (txRes as any).data || [];
      const shares = (sharesRes as any).data || [];

      const now = new Date();
      const activityData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        return {
          jour: d.toLocaleDateString("fr-FR", { weekday: "short" }),
          activités: Math.floor(Math.random() * 20) + 1,
          nouveaux: profiles.filter((p: any) => p.created_at.slice(0, 10) === key).length,
        };
      });

      return { profiles, companies, transactions, shares, activityData,
        stats: {
          users: profiles.length, companies: companies.length,
          pendingTx: transactions.filter((t: any) => t.status === "pending").length,
          recentShares: shares.length,
        }
      };
    },
  });

  const filteredProfiles = (data?.profiles || []).filter((p: any) => !search || `${p.first_name} ${p.last_name} ${p.msn_id}`.toLowerCase().includes(search.toLowerCase()));
  const filteredCompanies = (data?.companies || []).filter((c: any) => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const showUsers = ["gestionnaire_utilisateurs", "moderateur"].includes(role);
  const showFinance = ["comptable", "gestionnaire_achats"].includes(role);
  const showCompanies = ["consultant", "communication", "informaticien"].includes(role);

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;

  const colorClass = config.color;
  const bgClass = config.bg;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        <div className={`border-b mb-6`} style={{ background: `linear-gradient(to right, ${colorClass.replace("text-", "").replace("-400", "")} 5%opacity-10, transparent)`, borderColor: "hsl(var(--border))" }}>
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bgClass} border flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${colorClass}`} />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-2xl text-foreground">Espace {config.label}</h1>
                  <p className="text-sm text-muted-foreground">{profile?.first_name} {profile?.last_name} · {config.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/dashboard"><Button variant="outline" size="sm" className="text-xs">← Mon compte</Button></Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 space-y-6">
          {/* KPIs contextuel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Membres", value: (data as any)?.profiles?.length || (data as any)?.stats?.users || "—", icon: Users, c: "text-blue-400 bg-blue-500/10" },
              { label: "Entreprises", value: (data as any)?.stats?.companies || "—", icon: Building2, c: "text-amber-400 bg-amber-500/10" },
              { label: "Demandes en attente", value: (data as any)?.stats?.pendingTx || 0, icon: Clock, c: "text-orange-400 bg-orange-500/10" },
              { label: "Participations récentes", value: (data as any)?.stats?.recentShares || 0, icon: Coins, c: "text-emerald-400 bg-emerald-500/10" },
            ].map((kpi, i) => (
              <div key={i} className="glass-card p-5 hover:border-primary/20 transition-all">
                <div className={`w-10 h-10 rounded-xl ${kpi.c} flex items-center justify-center mb-3`}><kpi.icon className="h-5 w-5" /></div>
                <p className="font-heading font-bold text-2xl text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Activity chart */}
          <div className="glass-card p-6">
            <h3 className="font-heading font-semibold text-foreground mb-1">Activité de la semaine</h3>
            <p className="text-xs text-muted-foreground mb-4">Nouveaux membres inscrits par jour</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.activityData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="nouveaux" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Nouveaux membres" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Content based on role */}
          {showUsers && (
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-heading font-semibold text-foreground">Membres de la plateforme</h2>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-8 text-xs w-52" value={search} onChange={e => setSearch(e.target.value)} /></div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Membre</TableHead>
                    <TableHead className="text-xs">ID MSN</TableHead>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">Inscrit le</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredProfiles.slice(0, 50).map((p: any) => (
                      <TableRow key={p.user_id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                        <TableCell className="text-xs font-medium text-foreground">{p.first_name} {p.last_name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{p.msn_id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.phone || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {showCompanies && (
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-heading font-semibold text-foreground">Entreprises partenaires</h2>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-8 text-xs w-52" value={search} onChange={e => setSearch(e.target.value)} /></div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Entreprise</TableHead>
                    <TableHead className="text-xs">Secteur</TableHead>
                    <TableHead className="text-xs">Prix / Titre</TableHead>
                    <TableHead className="text-xs">Disponibles</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredCompanies.slice(0, 50).map((c: any) => (
                      <TableRow key={c.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                        <TableCell className="text-xs font-medium text-foreground">{c.name}</TableCell>
                        <TableCell><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{c.sector}</span></TableCell>
                        <TableCell className="font-heading font-bold text-amber-400 text-sm">{Number(c.price_per_share).toLocaleString()} F</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.available_shares}/{c.total_shares}</TableCell>
                        <TableCell><Link to={`/entreprises/${c.id}`}><Button variant="outline" size="sm" className="h-7 text-xs">Voir</Button></Link></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {showFinance && (
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border/50">
                <h2 className="font-heading font-semibold text-foreground">Transactions récentes</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Montant</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {((data as any)?.transactions || []).slice(0, 50).map((tx: any) => (
                      <TableRow key={tx.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                        <TableCell><div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-400" : tx.type === "withdrawal" ? "bg-rose-500/10 text-rose-400" : "bg-blue-500/10 text-blue-400"}`}>{tx.type}</div></TableCell>
                        <TableCell className="font-heading font-bold text-foreground text-sm">{fmtCurrency(Number(tx.amount))}</TableCell>
                        <TableCell><div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${tx.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : tx.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>{tx.status}</div></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{tx.description || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Recent participations */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <h2 className="font-heading font-semibold text-foreground">Participations récentes</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs">Entreprise</TableHead>
                  <TableHead className="text-xs">N° Ordre</TableHead>
                  <TableHead className="text-xs">Quantité</TableHead>
                  <TableHead className="text-xs">Prix d'achat</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {((data as any)?.shares || []).slice(0, 30).map((sh: any) => (
                    <TableRow key={sh.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                      <TableCell className="text-xs font-medium text-foreground">{(sh.companies as any)?.name || "—"}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{sh.order_number}</TableCell>
                      <TableCell className="text-xs font-bold text-foreground">{sh.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{Number(sh.purchase_price).toLocaleString()} FCFA</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(sh.purchase_date).toLocaleDateString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericRoleDashboard;
