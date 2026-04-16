// FinancierDashboard.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight,
  Activity, BarChart3, DollarSign, Loader2, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ComposedChart, Line,
} from "recharts";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invokePlatformAction } from "@/lib/platform-actions";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const fmtCurrency = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA";
const fmtShort = (v: number) =>
  v >= 1_000_000 ? (v / 1_000_000).toFixed(2) + "M" :
  v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);

const FinancierDashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "pending" | "history">("overview");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string; decision: "approved" | "rejected"; label: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["financier-dashboard", user?.id],
    queryFn: async () => {
      const [transactionsRes, walletsRes, profilesRes] = await Promise.all([
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("wallets").select("*"),
        supabase.from("profiles").select("user_id, first_name, last_name, msn_id"),
      ]);

      const transactions = transactionsRes.data || [];
      const wallets = walletsRes.data || [];
      const profiles = profilesRes.data || [];
      const profileMap = profiles.reduce<Record<string, any>>((acc, p) => { acc[p.user_id] = p; return acc; }, {});

      const pending = transactions.filter(t => t.status === "pending");
      const approved = transactions.filter(t => t.status === "approved");
      const totalBalance = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);
      const totalDeposits = approved.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
      const totalWithdrawals = approved.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);
      const totalPurchases = approved.filter(t => t.type === "purchase").reduce((s, t) => s + Number(t.amount), 0);

      // 30-day flow chart
      const now = new Date();
      const flowData = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().slice(0, 10);
        const dayTx = transactions.filter(t => t.created_at.slice(0, 10) === key && t.status === "approved");
        return {
          date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          entrées: dayTx.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0),
          sorties: dayTx.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0),
          achats: dayTx.filter(t => t.type === "purchase").reduce((s, t) => s + Number(t.amount), 0),
        };
      });

      return {
        transactions, pending, approved, totalBalance,
        totalDeposits, totalWithdrawals, totalPurchases,
        flowData, profileMap,
        stats: {
          pendingCount: pending.length,
          approvedCount: approved.length,
          totalTx: transactions.length,
          walletCount: wallets.length,
        },
      };
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      invokePlatformAction("admin_process_transaction", { transactionId: id, decision }),
    onSuccess: async () => {
      toast.success("Demande traitée avec succès.");
      await queryClient.invalidateQueries({ queryKey: ["financier-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const txTypeStyle: Record<string, [string, string]> = {
    deposit: ["DÉPÔT", "text-emerald-400 bg-emerald-500/10"],
    withdrawal: ["RETRAIT", "text-rose-400 bg-rose-500/10"],
    purchase: ["ACHAT", "text-blue-400 bg-blue-500/10"],
    sale: ["VENTE", "text-purple-400 bg-purple-500/10"],
    transfer: ["TRANSFERT", "text-amber-400 bg-amber-500/10"],
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#030711 0%,#050d1a 50%,#030711 100%)" }}>
      <Navbar />

      <div className="pt-20 pb-4 border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-mono text-xs text-emerald-400/60 tracking-widest mb-1">ESPACE FINANCIER</p>
              <h1 className="font-mono font-bold text-xl text-white">{profile?.first_name} {profile?.last_name}</h1>
              <p className="font-mono text-xs text-white/30">{profile?.msn_id}</p>
            </div>
            {(data?.stats.pendingCount || 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono text-xs text-amber-400">{data?.stats.pendingCount} DEMANDE(S) EN ATTENTE</span>
              </div>
            )}
          </div>

          <div className="flex gap-1 mt-5">
            {[{ k: "overview", l: "APERÇU" }, { k: "pending", l: `ATTENTE (${data?.stats.pendingCount || 0})` }, { k: "history", l: "HISTORIQUE" }].map(({ k, l }) => (
              <button key={k} onClick={() => setActiveTab(k as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-mono tracking-widest transition-all ${activeTab === k ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-white/30 hover:text-white/60 border border-transparent"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-5">

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: "TOTAL PORTEFEUILLES", v: fmtShort(data?.totalBalance || 0) + " FCFA", Icon: Wallet, c: "amber" },
                { l: "DÉPÔTS VALIDÉS", v: fmtShort(data?.totalDeposits || 0) + " FCFA", Icon: ArrowDownLeft, c: "emerald" },
                { l: "RETRAITS VALIDÉS", v: fmtShort(data?.totalWithdrawals || 0) + " FCFA", Icon: ArrowUpRight, c: "rose" },
                { l: "INVESTISSEMENTS", v: fmtShort(data?.totalPurchases || 0) + " FCFA", Icon: TrendingUp, c: "blue" },
              ].map(({ l, v, Icon, c }) => {
                const cls: Record<string, string> = { amber: "border-amber-500/20 from-amber-500/10", emerald: "border-emerald-500/20 from-emerald-500/10", rose: "border-rose-500/20 from-rose-500/10", blue: "border-blue-500/20 from-blue-500/10" };
                const icls: Record<string, string> = { amber: "text-amber-400", emerald: "text-emerald-400", rose: "text-rose-400", blue: "text-blue-400" };
                return (
                  <div key={l} className={`rounded-2xl border bg-gradient-to-br to-transparent p-5 ${cls[c]}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${icls[c]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="font-mono text-[10px] text-white/30 tracking-widest">{l}</p>
                    <p className="font-mono font-bold text-white text-xl mt-1">{isLoading ? "..." : v}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/5 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest mb-4">FLUX FINANCIERS — 30 JOURS</h3>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data?.flowData || []}>
                  <defs>
                    <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)", fontFamily: "monospace" }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => fmtCurrency(v)} contentStyle={{ background: "#0a0f1e", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 10, fontFamily: "monospace" }} labelStyle={{ color: "rgba(255,255,255,0.4)" }} />
                  <Area type="monotone" dataKey="entrées" stroke="#10b981" strokeWidth={1.5} fill="url(#gE)" name="Entrées" />
                  <Area type="monotone" dataKey="sorties" stroke="#f43f5e" strokeWidth={1.5} fill="url(#gS)" name="Sorties" />
                  <Bar dataKey="achats" fill="#3b82f6" fillOpacity={0.6} radius={[2, 2, 0, 0]} name="Achats" />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeTab === "pending" && (
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="p-4 border-b border-white/5">
              <h2 className="font-mono font-bold text-white/70 tracking-wider text-xs">DEMANDES EN ATTENTE ({data?.pending?.length || 0})</h2>
            </div>
            <div className="divide-y divide-white/5">
              {(data?.pending || []).map((tx: any) => {
                const owner = data?.profileMap?.[tx.user_id];
                const [label, style] = txTypeStyle[tx.type] || [tx.type, "text-white/40 bg-white/5"];
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold ${style.split(" ")[1]} ${style.split(" ")[0]}`}>
                        {label[0]}
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold text-white/90">{owner?.first_name} {owner?.last_name}</p>
                        <p className="font-mono text-[10px] text-amber-400/60">{owner?.msn_id}</p>
                        <p className="font-mono text-[10px] text-white/30">{tx.description || "—"}</p>
                        <p className="font-mono text-[10px] text-white/20">{new Date(tx.created_at).toLocaleDateString("fr-FR")} {new Date(tx.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono font-bold text-white">{fmtCurrency(Number(tx.amount))}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${style}`}>{label}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDialog({ open: true, id: tx.id, decision: "approved", label: `Valider ${label} de ${fmtCurrency(Number(tx.amount))} pour ${owner?.first_name}?` })}
                          disabled={processMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/20 disabled:opacity-50">
                          <CheckCircle2 className="h-3 w-3" />VALIDER
                        </button>
                        <button
                          onClick={() => processMutation.mutate({ id: tx.id, decision: "rejected" })}
                          disabled={processMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono hover:bg-rose-500/20 disabled:opacity-50">
                          <XCircle className="h-3 w-3" />REJETER
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(data?.pending || []).length === 0 && (
                <div className="p-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400/30 mx-auto mb-3" />
                  <p className="font-mono text-white/30 text-xs">AUCUNE DEMANDE EN ATTENTE</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="p-4 border-b border-white/5">
              <h2 className="font-mono font-bold text-white/70 tracking-wider text-xs">HISTORIQUE COMPLET ({data?.transactions?.length || 0})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {["TYPE", "MONTANT", "MEMBRE", "DATE", "STATUT"].map(h => (
                      <th key={h} className="text-[10px] font-mono text-white/20 tracking-widest text-left p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(data?.transactions || []).slice(0, 100).map((tx: any) => {
                    const owner = data?.profileMap?.[tx.user_id];
                    const [label, style] = txTypeStyle[tx.type] || [tx.type, "text-white/40 bg-white/5"];
                    const statusColor: Record<string, string> = { approved: "text-emerald-400", pending: "text-amber-400", rejected: "text-rose-400" };
                    return (
                      <tr key={tx.id} className="hover:bg-white/2">
                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${style}`}>{label}</span></td>
                        <td className="p-4 font-mono font-bold text-white text-sm">{fmtCurrency(Number(tx.amount))}</td>
                        <td className="p-4">
                          <p className="font-mono text-xs text-white/70">{owner?.first_name} {owner?.last_name}</p>
                          <p className="font-mono text-[10px] text-amber-400/50">{owner?.msn_id}</p>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-white/30">{new Date(tx.created_at).toLocaleDateString("fr-FR")}</td>
                        <td className="p-4 font-mono text-[10px] font-bold uppercase"
                          style={{ color: statusColor[tx.status] || "rgba(255,255,255,0.3)" }}>
                          {tx.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={confirmDialog?.open || false} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent style={{ background: "#0a0f1e", border: "1px solid rgba(16,185,129,0.2)" }}>
          <DialogHeader>
            <DialogTitle className="font-mono text-emerald-400 tracking-wider">CONFIRMER LA VALIDATION</DialogTitle>
            <DialogDescription className="font-mono text-white/40 text-xs mt-2">{confirmDialog?.label}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-mono">ANNULER</button>
            <button onClick={() => { if (confirmDialog) { processMutation.mutate({ id: confirmDialog.id, decision: confirmDialog.decision }); setConfirmDialog(null); } }}
              className="px-6 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-mono hover:bg-emerald-500/25">
              CONFIRMER
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancierDashboard;
