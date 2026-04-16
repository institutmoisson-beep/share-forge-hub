import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ArrowDownLeft, ArrowUpRight, BarChart2, CheckCircle2, Clock, CreditCard, DollarSign, Loader2, TrendingDown, TrendingUp, Wallet, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokePlatformAction } from "@/lib/platform-actions";
import Navbar from "@/components/Navbar";
import { useState } from "react";

const fmtCurrency = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA";
const fmtShort = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);

const FinancierDashboard = () => {
  const { user, profile, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [txSearch, setTxSearch] = useState("");
  const canValidate = hasRole("financier") || hasRole("admin") || user?.email === "picelvus@gmail.com";

  const { data, isLoading } = useQuery({
    queryKey: ["financier-dashboard", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const [txRes, walletsRes, sharesRes] = await Promise.all([
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("wallets").select("*"),
        supabase.from("user_shares").select("*, companies(name, price_per_share)").limit(200),
      ]);

      const transactions = txRes.data || [];
      const wallets = walletsRes.data || [];
      const shares = sharesRes.data || [];

      const pending = transactions.filter(t => t.status === "pending");
      const approved = transactions.filter(t => t.status === "approved");
      const deposits = approved.filter(t => t.type === "deposit");
      const withdrawals = approved.filter(t => t.type === "withdrawal");
      const purchases = approved.filter(t => t.type === "purchase");

      const now = new Date();
      const dailyData = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().slice(0, 10);
        const dayTx = approved.filter(t => t.created_at.slice(0, 10) === key);
        return {
          date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          entrées: dayTx.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0),
          sorties: dayTx.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0),
          investissements: dayTx.filter(t => t.type === "purchase").reduce((s, t) => s + Number(t.amount), 0),
        };
      });

      const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0);
      const totalInflow = deposits.reduce((s, t) => s + Number(t.amount), 0);
      const totalOutflow = withdrawals.reduce((s, t) => s + Number(t.amount), 0);
      const totalInvested = purchases.reduce((s, t) => s + Number(t.amount), 0);

      return { transactions, pending, deposits, withdrawals, purchases, dailyData, wallets,
        stats: { totalBalance, totalInflow, totalOutflow, totalInvested, pending: pending.length, approvedToday: approved.filter(t => t.created_at.slice(0, 10) === now.toISOString().slice(0, 10)).length }
      };
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      invokePlatformAction("admin_process_transaction", { transactionId: id, decision }),
    onSuccess: async () => { toast.success("Transaction traitée."); await queryClient.invalidateQueries({ queryKey: ["financier-dashboard"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = data?.stats;
  const filteredPending = (data?.pending || []).filter(t => !txSearch || (t.description || t.type || "").toLowerCase().includes(txSearch.toLowerCase()));

  if (isLoading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-500/10 mb-6">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-2xl text-foreground">Tableau Financier</h1>
                  <p className="text-sm text-emerald-400/80">{profile?.first_name} {profile?.last_name} · Analyse & Contrôle</p>
                </div>
              </div>
              {s?.pending > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium animate-pulse">
                  <Clock className="h-4 w-4" />
                  {s.pending} demande{s.pending > 1 ? "s" : ""} en attente
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Soldes cumulés", value: fmtShort(s?.totalBalance || 0) + " FCFA", icon: Wallet, color: "text-emerald-400 bg-emerald-500/10", trend: true },
              { label: "Entrées totales", value: fmtShort(s?.totalInflow || 0) + " FCFA", icon: ArrowDownLeft, color: "text-blue-400 bg-blue-500/10" },
              { label: "Sorties totales", value: fmtShort(s?.totalOutflow || 0) + " FCFA", icon: ArrowUpRight, color: "text-rose-400 bg-rose-500/10" },
              { label: "Investi", value: fmtShort(s?.totalInvested || 0) + " FCFA", icon: TrendingUp, color: "text-amber-400 bg-amber-500/10" },
              { label: "En attente", value: s?.pending || 0, icon: Clock, color: "text-orange-400 bg-orange-500/10" },
              { label: "Validées aujourd'hui", value: s?.approvedToday || 0, icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10" },
            ].map((kpi, i) => (
              <div key={i} className="glass-card p-4 hover:border-emerald-500/20 transition-all">
                <div className={`w-9 h-9 rounded-lg ${kpi.color} flex items-center justify-center mb-3`}>
                  <kpi.icon className="h-4.5 w-4.5" />
                </div>
                <p className="font-heading font-bold text-xl text-foreground">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="glass-card p-6">
            <h3 className="font-heading font-semibold text-foreground mb-1">Flux financiers — 30 jours</h3>
            <p className="text-xs text-muted-foreground mb-4">Entrées, sorties et investissements journaliers</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.dailyData || []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => fmtCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="entrées" stroke="#10b981" strokeWidth={2} fill="url(#gIn)" />
                <Area type="monotone" dataKey="sorties" stroke="#f43f5e" strokeWidth={2} fill="url(#gOut)" />
                <Area type="monotone" dataKey="investissements" stroke="#f59e0b" strokeWidth={2} fill="url(#gInv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pending Transactions */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Demandes en attente
                  {filteredPending.length > 0 && <span className="bg-amber-500 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredPending.length}</span>}
                </h2>
                <p className="text-xs text-muted-foreground">Validation des dépôts et retraits</p>
              </div>
              <Input placeholder="Filtrer..." className="h-8 text-xs w-48" value={txSearch} onChange={e => setTxSearch(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Montant</TableHead>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">Référence</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    {canValidate && <TableHead className="text-xs text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPending.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Aucune demande en attente ✓</TableCell></TableRow>
                  ) : filteredPending.map(tx => (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-amber-500/5 transition-colors">
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {tx.type === "deposit" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {tx.type}
                        </div>
                      </TableCell>
                      <TableCell className="font-heading font-bold text-foreground">{fmtCurrency(Number(tx.amount))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.payment_contact || "—"}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{tx.payment_transaction_id || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{tx.description || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                      {canValidate && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="gold" className="h-7 text-xs px-3"
                              onClick={() => processMutation.mutate({ id: tx.id, decision: "approved" })}
                              disabled={processMutation.isPending}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />Valider
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5"
                              onClick={() => processMutation.mutate({ id: tx.id, decision: "rejected" })}
                              disabled={processMutation.isPending}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* All Transactions */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <h2 className="font-heading font-semibold text-foreground">Historique des transactions</h2>
              <p className="text-xs text-muted-foreground">200 dernières transactions</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Montant</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.transactions || []).slice(0, 50).map(tx => (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-400" : tx.type === "withdrawal" ? "bg-rose-500/10 text-rose-400" : tx.type === "purchase" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                          {tx.type}
                        </div>
                      </TableCell>
                      <TableCell className="font-heading font-bold text-foreground text-sm">{fmtCurrency(Number(tx.amount))}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${tx.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : tx.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                          {tx.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{tx.description || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
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

export default FinancierDashboard;
