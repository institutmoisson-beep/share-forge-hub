import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertCircle, ArrowDownLeft, ArrowUpRight, BarChart2, Bell, Building2,
  CheckCircle2, ChevronDown, ChevronUp, Coins, CreditCard, DollarSign,
  Eye, Filter, Globe, LayoutDashboard, ListChecks, Loader2, LogOut,
  Menu, PieChart, Plus, RefreshCw, Search, Settings, Shield, Sliders,
  TrendingDown, TrendingUp, Upload, UserCog, UserPlus, Users, Wallet, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

import Navbar from "@/components/Navbar";
import ImageUpload from "@/components/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVITY_SECTORS, type ActivitySector } from "@/data/sectors";
import { supabase } from "@/integrations/supabase/client";
import { invokePlatformAction } from "@/lib/platform-actions";

const APP_ROLES = [
  "admin","courtier","financier","gestionnaire_entreprises","gestionnaire_achats",
  "gestionnaire_utilisateurs","communication","comptable","moderateur","consultant","informaticien",
] as const;
type AppRole = (typeof APP_ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur", courtier: "Courtier", financier: "Financier",
  gestionnaire_entreprises: "Gest. Entreprises", gestionnaire_achats: "Gest. Achats",
  gestionnaire_utilisateurs: "Gest. Utilisateurs", communication: "Communication",
  comptable: "Comptable", moderateur: "Modérateur", consultant: "Consultant",
  informaticien: "Informaticien",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  courtier: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  financier: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  gestionnaire_entreprises: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  gestionnaire_achats: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  gestionnaire_utilisateurs: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  communication: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  comptable: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  moderateur: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  consultant: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  informaticien: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

type CompanyFormState = {
  name: string; registre_commerce: string; country: string; city: string;
  location: string; sector: ActivitySector; description: string;
  total_shares: number; available_shares: number; price_per_share: number;
  previous_price: number; logo_url: string; video_url: string; is_active: boolean;
};

const isActivitySector = (v: string): v is ActivitySector =>
  (ACTIVITY_SECTORS as readonly string[]).includes(v);

const emptyCompanyForm: CompanyFormState = {
  name: "", registre_commerce: "", country: "", city: "", location: "",
  sector: ACTIVITY_SECTORS[0], description: "", total_shares: 0,
  available_shares: 0, price_per_share: 0, previous_price: 0,
  logo_url: "", video_url: "", is_active: true,
};

const fmtCurrency = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA";
const fmtShort = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);

const PIE_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

const KpiCard = ({ title, value, sub, icon: Icon, trend, color = "primary", loading = false }: any) => (
  <div className="glass-card p-5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 ${color === "primary" ? "bg-amber-400" : color === "success" ? "bg-emerald-400" : color === "danger" ? "bg-rose-400" : "bg-blue-400"}`} />
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === "primary" ? "bg-amber-500/10 text-amber-400" : color === "success" ? "bg-emerald-500/10 text-emerald-400" : color === "danger" ? "bg-rose-500/10 text-rose-400" : "bg-blue-500/10 text-blue-400"}`}>
        <Icon className="h-5 w-5" />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    {loading ? (
      <div className="space-y-2"><div className="h-7 w-24 bg-secondary rounded animate-pulse" /><div className="h-4 w-32 bg-secondary/50 rounded animate-pulse" /></div>
    ) : (
      <>
        <p className="font-heading font-bold text-2xl text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </>
    )}
  </div>
);

const AdminDashboard = () => {
  const { user, loading: authLoading, hasRole, refreshRoles } = useAuth();
  const queryClient = useQueryClient();
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(emptyCompanyForm);
  const [serviceForm, setServiceForm] = useState({ name: "", contact: "", payment_link: "", instructions: "", is_active: true });
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole | "">>({});
  const [companySearch, setCompanySearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const isAdmin = hasRole("admin") || user?.email === "picelvus@gmail.com";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-v2", user?.id],
    enabled: !authLoading && !!user && isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const [companiesRes, profilesRes, rolesRes, walletsRes, transactionsRes, servicesRes, sharesRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("wallets").select("*"),
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("payment_services").select("*").order("created_at", { ascending: false }),
        supabase.from("user_shares").select("*, companies(name, price_per_share)").order("purchase_date", { ascending: false }).limit(200),
      ]);

      const profiles = profilesRes.data || [];
      const roleRecords = rolesRes.data || [];
      const wallets = walletsRes.data || [];
      const transactions = transactionsRes.data || [];
      const shares = sharesRes.data || [];
      const companies = companiesRes.data || [];

      const rolesByUserId = roleRecords.reduce<Record<string, string[]>>((acc, r) => { acc[r.user_id] = [...(acc[r.user_id] || []), r.role]; return acc; }, {});
      const walletsByUserId = wallets.reduce<Record<string, number>>((acc, w) => { acc[w.user_id] = Number(w.balance || 0); return acc; }, {});
      const profilesByUserId = profiles.reduce<Record<string, any>>((acc, p) => { acc[p.user_id] = p; return acc; }, {});
      const users = profiles.map(p => ({ ...p, roles: rolesByUserId[p.user_id] || [], walletBalance: walletsByUserId[p.user_id] || 0 }));
      const enrichedShares = shares.map(s => ({ ...s, owner: profilesByUserId[s.user_id] }));

      // Chart data: transactions by day (last 14 days)
      const now = new Date();
      const txByDay = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (13 - i));
        const key = d.toISOString().slice(0, 10);
        const dayTx = transactions.filter(t => t.created_at.slice(0, 10) === key);
        return {
          date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          dépôts: dayTx.filter(t => t.type === "deposit" && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0),
          achats: dayTx.filter(t => t.type === "purchase").reduce((s, t) => s + Number(t.amount), 0),
          retraits: dayTx.filter(t => t.type === "withdrawal" && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0),
        };
      });

      // Sector distribution
      const sectorMap: Record<string, number> = {};
      companies.forEach(c => { sectorMap[c.sector] = (sectorMap[c.sector] || 0) + 1; });
      const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

      // Role distribution
      const roleMap: Record<string, number> = {};
      roleRecords.forEach(r => { roleMap[r.role] = (roleMap[r.role] || 0) + 1; });

      const totalBalance = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);
      const totalInvested = shares.reduce((s, sh) => s + Number(sh.purchase_price) * sh.quantity, 0);
      const approvedDeposits = transactions.filter(t => t.type === "deposit" && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0);

      return {
        companies, paymentServices: servicesRes.data || [], transactions, users, roleRecords,
        shares: enrichedShares, txByDay, sectorData, roleMap,
        stats: {
          companies: companies.length, activeCompanies: companies.filter(c => c.is_active).length,
          users: users.length, pendingTx: transactions.filter(t => t.status === "pending").length,
          totalBalance, totalInvested, approvedDeposits,
          totalShares: shares.reduce((s, sh) => s + sh.quantity, 0),
        },
      };
    },
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-v2"] }),
      queryClient.invalidateQueries({ queryKey: ["companies"] }),
      queryClient.invalidateQueries({ queryKey: ["featured-companies"] }),
    ]);
  };

  const companyMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...companyForm, total_shares: Number(companyForm.total_shares), available_shares: Number(companyForm.available_shares), price_per_share: Number(companyForm.price_per_share), previous_price: Number(companyForm.previous_price || companyForm.price_per_share) };
      if (!payload.name || !payload.registre_commerce || !payload.country || !payload.city) throw new Error("Champs obligatoires manquants.");
      if (payload.available_shares > payload.total_shares) throw new Error("Titres disponibles > total.");
      if (editingCompanyId) { const { error } = await supabase.from("companies").update(payload).eq("id", editingCompanyId); if (error) throw error; return "Entreprise mise à jour."; }
      const { error } = await supabase.from("companies").insert({ ...payload, created_by: user?.id }); if (error) throw error; return "Entreprise créée.";
    },
    onSuccess: async (msg) => { toast.success(msg); setEditingCompanyId(null); setCompanyForm(emptyCompanyForm); setShowCompanyForm(false); await invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleCompanyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => { const { error } = await supabase.from("companies").update({ is_active: status }).eq("id", id); if (error) throw error; },
    onSuccess: async () => { toast.success("Statut mis à jour."); await invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const serviceMutation = useMutation({
    mutationFn: async () => { if (!serviceForm.name || !serviceForm.contact) throw new Error("Nom et contact requis."); const { error } = await supabase.from("payment_services").insert({ ...serviceForm, created_by: user?.id }); if (error) throw error; },
    onSuccess: async () => { toast.success("Service ajouté."); setServiceForm({ name: "", contact: "", payment_link: "", instructions: "", is_active: true }); await invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (data?.roleRecords.some(r => r.user_id === userId && r.role === role)) throw new Error("Rôle déjà attribué.");
      const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role, assigned_by: user?.id }]); if (error) throw error;
    },
    onSuccess: async (_, v) => { toast.success("Rôle attribué."); setSelectedRoles(p => ({ ...p, [v.userId]: "" })); await queryClient.invalidateQueries({ queryKey: ["admin-v2"] }); if (v.userId === user?.id) await refreshRoles(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const match = data?.roleRecords.find(r => r.user_id === userId && r.role === role); if (!match) throw new Error("Rôle introuvable.");
      const { error } = await supabase.from("user_roles").delete().eq("id", match.id); if (error) throw error;
    },
    onSuccess: async (_, v) => { toast.success("Rôle retiré."); await queryClient.invalidateQueries({ queryKey: ["admin-v2"] }); if (v.userId === user?.id) await refreshRoles(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const processTxMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      invokePlatformAction("admin_process_transaction", { transactionId: id, decision }),
    onSuccess: async () => { toast.success("Demande traitée."); await invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredCompanies = useMemo(() => (data?.companies || []).filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()) || c.city.toLowerCase().includes(companySearch.toLowerCase())), [data?.companies, companySearch]);
  const filteredTx = useMemo(() => (data?.transactions || []).filter(t => !txSearch || (t.description || "").toLowerCase().includes(txSearch.toLowerCase())), [data?.transactions, txSearch]);
  const filteredUsers = useMemo(() => (data?.users || []).filter(u => !userSearch || `${u.first_name} ${u.last_name} ${u.msn_id}`.toLowerCase().includes(userSearch.toLowerCase())), [data?.users, userSearch]);

  if (authLoading || (isAdmin && isLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Chargement du centre de contrôle...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="glass-card max-w-md mx-auto p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4"><Shield className="h-8 w-8 text-rose-400" /></div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Accès restreint</h1>
            <p className="text-muted-foreground mb-6">Zone réservée aux administrateurs.</p>
            <Link to="/dashboard"><Button variant="outline">Retour</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const s = data?.stats;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-16 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center"><LayoutDashboard className="h-4 w-4 text-primary-foreground" /></div>
            <div>
              <h1 className="font-heading font-bold text-foreground text-sm">Centre de Contrôle MSN</h1>
              <p className="text-xs text-muted-foreground">Plateforme d'administration avancée</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {s?.pendingTx > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium animate-pulse">
                <Bell className="h-3 w-3" />
                {s.pendingTx} en attente
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1.5" />Actualiser
            </Button>
            <Link to="/dashboard"><Button variant="ghost" size="sm" className="text-xs">← Tableau de bord</Button></Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          <div className="col-span-2"><KpiCard title="Soldes cumulés" value={fmtShort(s?.totalBalance || 0) + " FCFA"} sub="Tous portefeuilles" icon={Wallet} color="primary" loading={isLoading} /></div>
          <div className="col-span-2"><KpiCard title="Capital investi" value={fmtShort(s?.totalInvested || 0) + " FCFA"} sub="Achats validés" icon={TrendingUp} color="success" loading={isLoading} /></div>
          <div className="col-span-2"><KpiCard title="Dépôts reçus" value={fmtShort(s?.approvedDeposits || 0) + " FCFA"} sub="Total validé" icon={ArrowDownLeft} color="primary" loading={isLoading} /></div>
          <KpiCard title="Entreprises" value={s?.activeCompanies || 0} sub={`${s?.companies || 0} total`} icon={Building2} loading={isLoading} />
          <KpiCard title="Membres" value={s?.users || 0} sub="Inscrits" icon={Users} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <KpiCard title="Titres émis" value={fmtShort(s?.totalShares || 0)} sub="Participations totales" icon={Coins} color="primary" loading={isLoading} />
          <KpiCard title="Demandes en attente" value={s?.pendingTx || 0} sub="À traiter" icon={AlertCircle} color="danger" loading={isLoading} />
          <KpiCard title="Services paiement" value={data?.paymentServices.length || 0} sub="Actifs" icon={CreditCard} loading={isLoading} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Volume chart */}
          <div className="xl:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold text-foreground">Volume des transactions</h3>
                <p className="text-xs text-muted-foreground">14 derniers jours</p>
              </div>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.txByDay || []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gDeposit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gPurchase" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => fmtCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="dépôts" stroke="#f59e0b" strokeWidth={2} fill="url(#gDeposit)" />
                <Area type="monotone" dataKey="achats" stroke="#10b981" strokeWidth={2} fill="url(#gPurchase)" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Pie */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-foreground">Secteurs</h3>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RechartsPie>
                <Pie data={data?.sectorData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {(data?.sectorData || []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {(data?.sectorData || []).map((s: any, i: number) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-muted-foreground truncate max-w-[120px]">{s.name}</span></div>
                  <span className="text-foreground font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <TabsList className="bg-secondary/50 h-auto p-1 flex-shrink-0">
              <TabsTrigger value="transactions" className="text-xs px-3 py-1.5">
                <Zap className="h-3 w-3 mr-1.5" />
                Demandes {s?.pendingTx > 0 && <span className="ml-1.5 bg-amber-500 text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{s.pendingTx}</span>}
              </TabsTrigger>
              <TabsTrigger value="companies" className="text-xs px-3 py-1.5">
                <Building2 className="h-3 w-3 mr-1.5" />Entreprises
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs px-3 py-1.5">
                <Users className="h-3 w-3 mr-1.5" />Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="shares" className="text-xs px-3 py-1.5">
                <Coins className="h-3 w-3 mr-1.5" />Titres
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs px-3 py-1.5">
                <CreditCard className="h-3 w-3 mr-1.5" />Paiements
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TRANSACTIONS */}
          <TabsContent value="transactions">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-heading font-semibold text-foreground">Demandes de portefeuille</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{data?.transactions.length || 0} transactions • {s?.pendingTx || 0} en attente</p>
                </div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-8 text-xs w-52" value={txSearch} onChange={e => setTxSearch(e.target.value)} /></div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Montant</TableHead>
                      <TableHead className="text-xs">Membre</TableHead>
                      <TableHead className="text-xs">Référence</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.slice(0, 50).map(tx => {
                      const owner = data?.users.find(u => u.user_id === tx.user_id);
                      const isPending = tx.status === "pending";
                      return (
                        <TableRow key={tx.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-400" : tx.type === "withdrawal" ? "bg-rose-500/10 text-rose-400" : tx.type === "purchase" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                              {tx.type === "deposit" ? <ArrowDownLeft className="h-3 w-3" /> : tx.type === "withdrawal" ? <ArrowUpRight className="h-3 w-3" /> : <Coins className="h-3 w-3" />}
                              {tx.type}
                            </div>
                          </TableCell>
                          <TableCell className="font-heading font-bold text-foreground text-sm">{fmtCurrency(Number(tx.amount))}</TableCell>
                          <TableCell>
                            <div><p className="text-xs font-medium text-foreground">{owner?.first_name} {owner?.last_name}</p><p className="text-[10px] text-muted-foreground font-mono">{owner?.msn_id}</p></div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{tx.payment_transaction_id || tx.recipient_msn_id || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${tx.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : tx.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                              {tx.status === "approved" ? <CheckCircle2 className="h-2.5 w-2.5" /> : tx.status === "pending" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
                              {tx.status}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="gold" className="h-7 text-xs px-3"
                                  onClick={() => setConfirmDialog({ open: true, title: "Valider la demande", message: `Valider ${tx.type} de ${fmtCurrency(Number(tx.amount))} ?`, onConfirm: () => processTxMutation.mutate({ id: tx.id, decision: "approved" }) })}
                                  disabled={processTxMutation.isPending}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />Valider
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs px-3"
                                  onClick={() => processTxMutation.mutate({ id: tx.id, decision: "rejected" })}
                                  disabled={processTxMutation.isPending}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : <span className="text-[10px] text-muted-foreground">Traitée</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* COMPANIES */}
          <TabsContent value="companies">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Rechercher une entreprise..." className="pl-9 h-8 text-xs w-64" value={companySearch} onChange={e => setCompanySearch(e.target.value)} /></div>
                <Button variant="gold" size="sm" className="text-xs" onClick={() => { setEditingCompanyId(null); setCompanyForm(emptyCompanyForm); setShowCompanyForm(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Nouvelle entreprise
                </Button>
              </div>

              <div className="glass-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-xs">Entreprise</TableHead>
                      <TableHead className="text-xs">Secteur</TableHead>
                      <TableHead className="text-xs">Prix / Titre</TableHead>
                      <TableHead className="text-xs">Titres</TableHead>
                      <TableHead className="text-xs">Progression</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map(company => {
                      const sold = company.total_shares - company.available_shares;
                      const pct = company.total_shares > 0 ? (sold / company.total_shares) * 100 : 0;
                      return (
                        <TableRow key={company.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                                {company.logo_url ? <img src={company.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-4 w-4 text-primary" />}
                              </div>
                              <div><p className="text-xs font-medium text-foreground">{company.name}</p><p className="text-[10px] text-muted-foreground">{company.city}, {company.country}</p></div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{company.sector}</TableCell>
                          <TableCell className="font-heading font-bold text-primary text-sm">{Number(company.price_per_share).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{company.available_shares}/{company.total_shares}</TableCell>
                          <TableCell>
                            <div className="w-24">
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Vendus</span><span>{pct.toFixed(0)}%</span></div>
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-gradient-gold rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${company.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-secondary text-muted-foreground border-border"}`}>
                              {company.is_active ? "Actif" : "Masqué"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                                onClick={() => { setEditingCompanyId(company.id); setCompanyForm({ name: company.name, registre_commerce: company.registre_commerce, country: company.country, city: company.city, location: company.location, sector: isActivitySector(company.sector) ? company.sector : ACTIVITY_SECTORS[0], description: company.description, total_shares: company.total_shares, available_shares: company.available_shares, price_per_share: Number(company.price_per_share), previous_price: Number(company.previous_price), logo_url: company.logo_url || "", video_url: company.video_url || "", is_active: company.is_active }); setShowCompanyForm(true); }}>
                                Modifier
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5"
                                onClick={() => toggleCompanyMutation.mutate({ id: company.id, status: !company.is_active })}
                                disabled={toggleCompanyMutation.isPending}>
                                {company.is_active ? "Masquer" : "Publier"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
                <div><h2 className="font-heading font-semibold text-foreground">Membres & Rôles</h2><p className="text-xs text-muted-foreground mt-0.5">{data?.users.length || 0} membres enregistrés</p></div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-8 text-xs w-52" value={userSearch} onChange={e => setUserSearch(e.target.value)} /></div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-xs">Membre</TableHead>
                      <TableHead className="text-xs">Contact</TableHead>
                      <TableHead className="text-xs">Solde</TableHead>
                      <TableHead className="text-xs">Rôles</TableHead>
                      <TableHead className="text-xs text-right">Attribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(profile => (
                      <TableRow key={profile.user_id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                        <TableCell>
                          <div><p className="text-xs font-medium text-foreground">{profile.first_name} {profile.last_name}</p><p className="text-[10px] text-muted-foreground font-mono">{profile.msn_id}</p></div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{profile.phone || "—"}</TableCell>
                        <TableCell className="font-heading font-bold text-foreground text-xs">{fmtShort(profile.walletBalance)} FCFA</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {profile.roles.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground">Aucun rôle</span>
                            ) : profile.roles.map((role: string) => (
                              <div key={`${profile.user_id}-${role}`} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_COLORS[role] || "bg-secondary text-muted-foreground border-border"}`}>
                                {ROLE_LABELS[role] || role}
                                {role !== "admin" && (
                                  <button onClick={() => removeRoleMutation.mutate({ userId: profile.user_id, role })} className="hover:opacity-100 opacity-70 transition-opacity ml-0.5">
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Select value={selectedRoles[profile.user_id] || ""} onValueChange={v => setSelectedRoles(p => ({ ...p, [profile.user_id]: v as AppRole }))}>
                              <SelectTrigger className="h-7 text-[10px] w-40"><SelectValue placeholder="Choisir un rôle" /></SelectTrigger>
                              <SelectContent>{APP_ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="sm" variant="gold" className="h-7 text-xs px-2.5"
                              onClick={() => { const r = selectedRoles[profile.user_id]; if (r) roleMutation.mutate({ userId: profile.user_id, role: r }); }}
                              disabled={roleMutation.isPending || !selectedRoles[profile.user_id]}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* SHARES */}
          <TabsContent value="shares">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h2 className="font-heading font-semibold text-foreground">Registre des titres</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{data?.shares.length || 0} lignes • {fmtShort(s?.totalShares || 0)} titres au total</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-xs">Entreprise</TableHead>
                      <TableHead className="text-xs">Propriétaire</TableHead>
                      <TableHead className="text-xs">N° Ordre</TableHead>
                      <TableHead className="text-xs">Qté</TableHead>
                      <TableHead className="text-xs">Prix</TableHead>
                      <TableHead className="text-xs">Valeur actuelle</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.shares || []).slice(0, 100).map(sh => {
                      const currentPrice = Number((sh.companies as any)?.price_per_share || sh.purchase_price);
                      const value = currentPrice * sh.quantity;
                      const gain = (currentPrice - Number(sh.purchase_price)) * sh.quantity;
                      return (
                        <TableRow key={sh.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                          <TableCell className="text-xs font-medium text-foreground">{(sh.companies as any)?.name || "—"}</TableCell>
                          <TableCell><div><p className="text-xs text-foreground">{sh.owner?.first_name} {sh.owner?.last_name}</p><p className="text-[10px] text-muted-foreground font-mono">{sh.owner?.msn_id}</p></div></TableCell>
                          <TableCell className="text-[10px] text-muted-foreground font-mono">{sh.order_number}</TableCell>
                          <TableCell className="text-xs font-bold text-foreground">{sh.quantity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{Number(sh.purchase_price).toLocaleString()}</TableCell>
                          <TableCell>
                            <div><p className="text-xs font-bold text-foreground">{fmtShort(value)} FCFA</p><p className={`text-[10px] ${gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{gain >= 0 ? "+" : ""}{fmtShort(gain)} FCFA</p></div>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{new Date(sh.purchase_date).toLocaleDateString("fr-FR")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* PAYMENTS */}
          <TabsContent value="payments">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="glass-card p-6 space-y-4">
                <h2 className="font-heading font-semibold text-foreground">Ajouter un service de paiement</h2>
                <Input placeholder="Nom du service" value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} className="text-sm" />
                <Input placeholder="Contact (numéro, email...)" value={serviceForm.contact} onChange={e => setServiceForm(p => ({ ...p, contact: e.target.value }))} className="text-sm" />
                <Input placeholder="Lien de paiement (optionnel)" value={serviceForm.payment_link} onChange={e => setServiceForm(p => ({ ...p, payment_link: e.target.value }))} className="text-sm" />
                <Textarea placeholder="Instructions pour l'utilisateur" value={serviceForm.instructions} onChange={e => setServiceForm(p => ({ ...p, instructions: e.target.value }))} className="text-sm" />
                <Button variant="gold" onClick={() => serviceMutation.mutate()} disabled={serviceMutation.isPending} className="w-full">
                  {serviceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Ajouter le service
                </Button>
              </div>
              <div className="glass-card p-6">
                <h2 className="font-heading font-semibold text-foreground mb-4">Services actifs ({data?.paymentServices.length || 0})</h2>
                <div className="space-y-3">
                  {(data?.paymentServices || []).map(svc => (
                    <div key={svc.id} className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/20 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{svc.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{svc.contact}</p>
                          {svc.instructions && <p className="text-xs text-muted-foreground/70 mt-1">{svc.instructions}</p>}
                          {svc.payment_link && <a href={svc.payment_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block mt-1">→ Lien de paiement</a>}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${svc.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-secondary text-muted-foreground border-border"}`}>{svc.is_active ? "Actif" : "Inactif"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Company Form Dialog */}
      <Dialog open={showCompanyForm} onOpenChange={setShowCompanyForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompanyId ? "Modifier l'entreprise" : "Nouvelle entreprise partenaire"}</DialogTitle>
            <DialogDescription>Renseignez les informations de la société et ses paramètres de participation.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Input placeholder="Nom de l'entreprise *" value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))} /></div>
            <Input placeholder="Registre de commerce *" value={companyForm.registre_commerce} onChange={e => setCompanyForm(p => ({ ...p, registre_commerce: e.target.value }))} />
            <Select value={companyForm.sector} onValueChange={v => setCompanyForm(p => ({ ...p, sector: isActivitySector(v) ? v : ACTIVITY_SECTORS[0] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIVITY_SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Pays *" value={companyForm.country} onChange={e => setCompanyForm(p => ({ ...p, country: e.target.value }))} />
            <Input placeholder="Ville *" value={companyForm.city} onChange={e => setCompanyForm(p => ({ ...p, city: e.target.value }))} />
            <div className="col-span-2"><Input placeholder="Localisation précise" value={companyForm.location} onChange={e => setCompanyForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div className="col-span-2"><Textarea placeholder="Description de l'entreprise" value={companyForm.description} onChange={e => setCompanyForm(p => ({ ...p, description: e.target.value }))} /></div>
            <Input type="number" placeholder="Total titres" value={companyForm.total_shares} onChange={e => setCompanyForm(p => ({ ...p, total_shares: Number(e.target.value) }))} />
            <Input type="number" placeholder="Titres disponibles" value={companyForm.available_shares} onChange={e => setCompanyForm(p => ({ ...p, available_shares: Number(e.target.value) }))} />
            <Input type="number" placeholder="Prix actuel (FCFA)" value={companyForm.price_per_share} onChange={e => setCompanyForm(p => ({ ...p, price_per_share: Number(e.target.value) }))} />
            <Input type="number" placeholder="Prix précédent (FCFA)" value={companyForm.previous_price} onChange={e => setCompanyForm(p => ({ ...p, previous_price: Number(e.target.value) }))} />
            <div className="col-span-2">
              <ImageUpload value={companyForm.logo_url} onChange={url => setCompanyForm(p => ({ ...p, logo_url: url }))} folder="logos" label="Logo de l'entreprise" />
            </div>
            <div className="col-span-2"><Input placeholder="URL vidéo de présentation" value={companyForm.video_url} onChange={e => setCompanyForm(p => ({ ...p, video_url: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyForm(false)}>Annuler</Button>
            <Button variant="gold" onClick={() => companyMutation.mutate()} disabled={companyMutation.isPending}>
              {companyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCompanyId ? "Mettre à jour" : "Créer l'entreprise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog?.open || false} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmDialog?.title}</DialogTitle>
            <DialogDescription>{confirmDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Annuler</Button>
            <Button variant="gold" onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
