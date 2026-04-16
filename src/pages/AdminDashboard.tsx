import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertCircle, ArrowDownLeft, ArrowUpRight, BarChart2, Bell,
  Building2, CheckCircle2, ChevronRight, Coins, CreditCard, DollarSign,
  Eye, Globe, LayoutDashboard, Loader2, Plus, RefreshCw, Search,
  Shield, TrendingDown, TrendingUp, Upload, UserCog, Users, Wallet, X, Zap,
  Settings, Database, Lock, Unlock, PieChart, LineChart as LineChartIcon,
  ArrowRight, Clock, Hash, AlertTriangle, CheckCheck, XCircle, Minus,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart,
} from "recharts";

import Navbar from "@/components/Navbar";
import ImageUpload from "@/components/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVITY_SECTORS, type ActivitySector } from "@/data/sectors";
import { supabase } from "@/integrations/supabase/client";
import { invokePlatformAction } from "@/lib/platform-actions";

/* ─────────────────────────────────────────── constants ── */
const APP_ROLES = [
  "admin","courtier","financier","gestionnaire_entreprises","gestionnaire_achats",
  "gestionnaire_utilisateurs","communication","comptable","moderateur","consultant","informaticien",
] as const;
type AppRole = (typeof APP_ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  admin:"Administrateur",courtier:"Courtier",financier:"Financier",
  gestionnaire_entreprises:"Gest. Entreprises",gestionnaire_achats:"Gest. Achats",
  gestionnaire_utilisateurs:"Gest. Utilisateurs",communication:"Communication",
  comptable:"Comptable",moderateur:"Modérateur",consultant:"Consultant",
  informaticien:"Informaticien",
};

const ROLE_COLORS: Record<string,string> = {
  admin:"bg-rose-500/20 text-rose-300 border-rose-500/30",
  courtier:"bg-amber-500/20 text-amber-300 border-amber-500/30",
  financier:"bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  gestionnaire_entreprises:"bg-blue-500/20 text-blue-300 border-blue-500/30",
  gestionnaire_achats:"bg-purple-500/20 text-purple-300 border-purple-500/30",
  gestionnaire_utilisateurs:"bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  communication:"bg-pink-500/20 text-pink-300 border-pink-500/30",
  comptable:"bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  moderateur:"bg-orange-500/20 text-orange-300 border-orange-500/30",
  consultant:"bg-teal-500/20 text-teal-300 border-teal-500/30",
  informaticien:"bg-violet-500/20 text-violet-300 border-violet-500/30",
};

type CompanyFormState = {
  name:string;registre_commerce:string;country:string;city:string;
  location:string;sector:ActivitySector;description:string;
  total_shares:number;available_shares:number;price_per_share:number;
  previous_price:number;logo_url:string;video_url:string;is_active:boolean;
};

const isActivitySector = (v:string):v is ActivitySector =>
  (ACTIVITY_SECTORS as readonly string[]).includes(v);

const emptyCompanyForm:CompanyFormState = {
  name:"",registre_commerce:"",country:"",city:"",location:"",
  sector:ACTIVITY_SECTORS[0],description:"",total_shares:0,
  available_shares:0,price_per_share:0,previous_price:0,
  logo_url:"",video_url:"",is_active:true,
};

const fmtCurrency = (v:number) => new Intl.NumberFormat("fr-FR").format(v)+" FCFA";
const fmtShort = (v:number) =>
  v>=1_000_000_000?(v/1_000_000_000).toFixed(1)+"G":
  v>=1_000_000?(v/1_000_000).toFixed(1)+"M":
  v>=1_000?(v/1_000).toFixed(1)+"K":String(v);

const PIE_COLORS = ["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#06b6d4"];

/* ─────────────────────────────────────────── ticker ── */
const TickerBar = ({ companies }: { companies: any[] }) => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset(p => (p - 1) % (companies.length * 200 + 200)), 30);
    return () => clearInterval(id);
  }, [companies.length]);
  if (!companies.length) return null;
  return (
    <div className="overflow-hidden border-b border-amber-500/10 bg-black/30 py-1.5 text-xs">
      <div className="flex whitespace-nowrap" style={{ transform: `translateX(${offset}px)`, transition: "none" }}>
        {[...companies, ...companies].map((c, i) => {
          const chg = Number(c.price_per_share) - Number(c.previous_price);
          const pct = c.previous_price > 0 ? ((chg / c.previous_price) * 100).toFixed(2) : "0.00";
          const up = chg >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 px-6">
              <span className="text-amber-400 font-mono font-bold">{c.name.slice(0,8).toUpperCase()}</span>
              <span className="text-white font-mono">{Number(c.price_per_share).toLocaleString()}</span>
              <span className={`font-mono ${up?"text-emerald-400":"text-rose-400"}`}>
                {up?"+":""}{pct}%
              </span>
              <span className="text-white/20">│</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────── KPI card ── */
const KpiCard = ({ title, value, sub, icon: Icon, trend, accent="amber", loading=false }: any) => {
  const acc: Record<string,string> = {
    amber:"from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400",
    emerald:"from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    rose:"from-rose-500/20 to-rose-600/5 border-rose-500/20 text-rose-400",
    blue:"from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    purple:"from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
    cyan:"from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
  };
  const cls = acc[accent] || acc.amber;
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${cls}`}>
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10 blur-xl"
        style={{ background: `var(--color-${accent === "amber" ? "#f59e0b" : accent})` }} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-current/10`}>
          <Icon className={`h-5 w-5`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend>=0?"bg-emerald-500/15 text-emerald-400":"bg-rose-500/15 text-rose-400"}`}>
            {trend>=0?<TrendingUp className="h-3 w-3"/>:<TrendingDown className="h-3 w-3"/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-white/5 rounded animate-pulse"/>
          <div className="h-3 w-32 bg-white/5 rounded animate-pulse"/>
        </div>
      ) : (
        <>
          <p className="font-mono font-bold text-2xl text-white tracking-tight">{value}</p>
          <p className="text-xs text-white/50 mt-1">{title}</p>
          {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────── STATUS BADGE ── */
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string,[string,any]> = {
    approved: ["Validé", CheckCircle2],
    pending:  ["En attente", Clock],
    rejected: ["Rejeté", XCircle],
    active:   ["Actif", Activity],
    sold:     ["Vendu", CheckCheck],
    cancelled:["Annulé", XCircle],
  };
  const [label, Icon] = map[status] || [status, Activity];
  const color: Record<string,string> = {
    approved:"text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    pending:"text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse",
    rejected:"text-rose-400 bg-rose-500/10 border-rose-500/20",
    active:"text-blue-400 bg-blue-500/10 border-blue-500/20",
    sold:"text-purple-400 bg-purple-500/10 border-purple-500/20",
    cancelled:"text-gray-400 bg-gray-500/10 border-gray-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color[status]||"text-gray-400 bg-gray-500/10"}`}>
      <Icon className="h-2.5 w-2.5"/>{label}
    </span>
  );
};

/* ─────────────────────────────────────────── MAIN ── */
const AdminDashboard = () => {
  const { user, loading: authLoading, hasRole, refreshRoles } = useAuth();
  const queryClient = useQueryClient();
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(emptyCompanyForm);
  const [serviceForm, setServiceForm] = useState({ name:"",contact:"",payment_link:"",instructions:"",is_active:true });
  const [editingCompanyId, setEditingCompanyId] = useState<string|null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string,AppRole|">>({});
  const [companySearch, setCompanySearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [txFilter, setTxFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{open:boolean;title:string;message:string;onConfirm:()=>void}|null>(null);
  const [liveTime, setLiveTime] = useState(new Date());
  const isAdmin = hasRole("admin") || user?.email === "picelvus@gmail.com";

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-v3", user?.id],
    enabled: !authLoading && !!user && isAdmin,
    refetchInterval: 20000,
    queryFn: async () => {
      const [companiesRes, profilesRes, rolesRes, walletsRes, transactionsRes, servicesRes, sharesRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at",{ascending:false}),
        supabase.from("profiles").select("*").order("created_at",{ascending:false}),
        supabase.from("user_roles").select("*"),
        supabase.from("wallets").select("*"),
        supabase.from("wallet_transactions").select("*").order("created_at",{ascending:false}).limit(300),
        supabase.from("payment_services").select("*").order("created_at",{ascending:false}),
        supabase.from("user_shares").select("*, companies(name, price_per_share)").order("purchase_date",{ascending:false}).limit(300),
      ]);

      const profiles = profilesRes.data||[];
      const roleRecords = rolesRes.data||[];
      const wallets = walletsRes.data||[];
      const transactions = transactionsRes.data||[];
      const shares = sharesRes.data||[];
      const companies = companiesRes.data||[];

      const rolesByUserId = roleRecords.reduce<Record<string,string[]>>((acc,r)=>{acc[r.user_id]=[...(acc[r.user_id]||[]),r.role];return acc;},{});
      const walletsByUserId = wallets.reduce<Record<string,number>>((acc,w)=>{acc[w.user_id]=Number(w.balance||0);return acc;},{});
      const profilesByUserId = profiles.reduce<Record<string,any>>((acc,p)=>{acc[p.user_id]=p;return acc;},{});
      const users = profiles.map(p=>({...p,roles:rolesByUserId[p.user_id]||[],walletBalance:walletsByUserId[p.user_id]||0}));
      const enrichedShares = shares.map(s=>({...s,owner:profilesByUserId[s.user_id]}));

      // 30-day chart
      const now = new Date();
      const txByDay = Array.from({length:30},(_,i)=>{
        const d = new Date(now); d.setDate(d.getDate()-(29-i));
        const key = d.toISOString().slice(0,10);
        const dayTx = transactions.filter(t=>t.created_at.slice(0,10)===key);
        return {
          date:d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}),
          dépôts:dayTx.filter(t=>t.type==="deposit"&&t.status==="approved").reduce((s,t)=>s+Number(t.amount),0),
          achats:dayTx.filter(t=>t.type==="purchase").reduce((s,t)=>s+Number(t.amount),0),
          retraits:dayTx.filter(t=>t.type==="withdrawal"&&t.status==="approved").reduce((s,t)=>s+Number(t.amount),0),
          transferts:dayTx.filter(t=>t.type==="transfer").reduce((s,t)=>s+Number(t.amount),0),
        };
      });

      // Sector
      const sectorMap:Record<string,number>={};
      companies.forEach(c=>{sectorMap[c.sector]=(sectorMap[c.sector]||0)+1;});
      const sectorData = Object.entries(sectorMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);

      // Type distribution
      const typeMap:Record<string,number>={deposit:0,withdrawal:0,purchase:0,sale:0,transfer:0};
      transactions.filter(t=>t.status==="approved").forEach(t=>{typeMap[t.type]=(typeMap[t.type]||0)+Number(t.amount);});
      const typeData = Object.entries(typeMap).map(([name,value])=>({name,value}));

      const totalBalance = wallets.reduce((s,w)=>s+Number(w.balance||0),0);
      const totalInvested = shares.reduce((s,sh)=>s+Number(sh.purchase_price)*sh.quantity,0);
      const approvedDeposits = transactions.filter(t=>t.type==="deposit"&&t.status==="approved").reduce((s,t)=>s+Number(t.amount),0);
      const pendingTx = transactions.filter(t=>t.status==="pending");

      return {
        companies,paymentServices:servicesRes.data||[],transactions,users,roleRecords,
        shares:enrichedShares,txByDay,sectorData,typeData,
        stats:{
          companies:companies.length,activeCompanies:companies.filter(c=>c.is_active).length,
          users:users.length,pendingTx:pendingTx.length,
          totalBalance,totalInvested,approvedDeposits,
          totalShares:shares.reduce((s,sh)=>s+sh.quantity,0),
          totalTx:transactions.length,
          approvedTx:transactions.filter(t=>t.status==="approved").length,
          rejectedTx:transactions.filter(t=>t.status==="rejected").length,
        },
      };
    },
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey:["admin-v3"]}),
      queryClient.invalidateQueries({queryKey:["companies"]}),
      queryClient.invalidateQueries({queryKey:["featured-companies"]}),
    ]);
  };

  const companyMutation = useMutation({
    mutationFn: async () => {
      const payload = {...companyForm,total_shares:Number(companyForm.total_shares),available_shares:Number(companyForm.available_shares),price_per_share:Number(companyForm.price_per_share),previous_price:Number(companyForm.previous_price||companyForm.price_per_share)};
      if(!payload.name||!payload.registre_commerce||!payload.country||!payload.city) throw new Error("Champs obligatoires manquants.");
      if(payload.available_shares>payload.total_shares) throw new Error("Titres disponibles > total.");
      if(editingCompanyId){const{error}=await supabase.from("companies").update(payload).eq("id",editingCompanyId);if(error)throw error;return "Entreprise mise à jour.";}
      const{error}=await supabase.from("companies").insert({...payload,created_by:user?.id});if(error)throw error;return "Entreprise créée.";
    },
    onSuccess:async(msg)=>{toast.success(msg);setEditingCompanyId(null);setCompanyForm(emptyCompanyForm);setShowCompanyForm(false);await invalidate();},
    onError:(e:Error)=>toast.error(e.message),
  });

  const toggleCompanyMutation = useMutation({
    mutationFn:async({id,status}:{id:string;status:boolean})=>{const{error}=await supabase.from("companies").update({is_active:status}).eq("id",id);if(error)throw error;},
    onSuccess:async()=>{toast.success("Statut mis à jour.");await invalidate();},
    onError:(e:Error)=>toast.error(e.message),
  });

  const serviceMutation = useMutation({
    mutationFn:async()=>{if(!serviceForm.name||!serviceForm.contact)throw new Error("Nom et contact requis.");const{error}=await supabase.from("payment_services").insert({...serviceForm,created_by:user?.id});if(error)throw error;},
    onSuccess:async()=>{toast.success("Service ajouté.");setServiceForm({name:"",contact:"",payment_link:"",instructions:"",is_active:true});await invalidate();},
    onError:(e:Error)=>toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn:async({userId,role}:{userId:string;role:AppRole})=>{
      if(data?.roleRecords.some(r=>r.user_id===userId&&r.role===role))throw new Error("Rôle déjà attribué.");
      const{error}=await supabase.from("user_roles").insert([{user_id:userId,role,assigned_by:user?.id}]);if(error)throw error;
    },
    onSuccess:async(_,v)=>{toast.success("Rôle attribué.");setSelectedRoles(p=>({...p,[v.userId]:""}));await queryClient.invalidateQueries({queryKey:["admin-v3"]});if(v.userId===user?.id)await refreshRoles();},
    onError:(e:Error)=>toast.error(e.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn:async({userId,role}:{userId:string;role:string})=>{
      const match=data?.roleRecords.find(r=>r.user_id===userId&&r.role===role);if(!match)throw new Error("Rôle introuvable.");
      const{error}=await supabase.from("user_roles").delete().eq("id",match.id);if(error)throw error;
    },
    onSuccess:async(_,v)=>{toast.success("Rôle retiré.");await queryClient.invalidateQueries({queryKey:["admin-v3"]});if(v.userId===user?.id)await refreshRoles();},
    onError:(e:Error)=>toast.error(e.message),
  });

  const processTxMutation = useMutation({
    mutationFn:async({id,decision}:{id:string;decision:"approved"|"rejected"})=>
      invokePlatformAction("admin_process_transaction",{transactionId:id,decision}),
    onSuccess:async()=>{toast.success("Demande traitée.");await invalidate();},
    onError:(e:Error)=>toast.error(e.message),
  });

  const filteredCompanies = useMemo(()=>(data?.companies||[]).filter(c=>c.name.toLowerCase().includes(companySearch.toLowerCase())||c.city.toLowerCase().includes(companySearch.toLowerCase())),[data?.companies,companySearch]);
  const filteredTx = useMemo(()=>{
    let tx = data?.transactions||[];
    if(txFilter!=="all") tx = tx.filter(t=>t.status===txFilter);
    if(txSearch) tx = tx.filter(t=>(t.description||"").toLowerCase().includes(txSearch.toLowerCase()));
    return tx;
  },[data?.transactions,txSearch,txFilter]);
  const filteredUsers = useMemo(()=>(data?.users||[]).filter(u=>!userSearch||`${u.first_name} ${u.last_name} ${u.msn_id}`.toLowerCase().includes(userSearch.toLowerCase())),[data?.users,userSearch]);

  if(authLoading||(isAdmin&&isLoading)){
    return (
      <div className="min-h-screen" style={{background:"#030711"}}>
        <Navbar/>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-amber-400/60 font-mono text-sm tracking-widest">INITIALISATION DU SYSTÈME...</p>
          </div>
        </div>
      </div>
    );
  }

  if(!user||!isAdmin){
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:"#030711"}}>
        <Navbar/>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-rose-400"/>
          </div>
          <h1 className="font-mono font-bold text-2xl text-white mb-2">ACCÈS RESTREINT</h1>
          <p className="text-white/40 text-sm mb-6">Zone réservée aux administrateurs de la plateforme MSN.</p>
          <Link to="/dashboard"><Button variant="outline">← Retour</Button></Link>
        </div>
      </div>
    );
  }

  const s = data?.stats;

  return (
    <div className="min-h-screen" style={{background:"linear-gradient(135deg, #030711 0%, #050d1a 50%, #030711 100%)"}}>
      <Navbar/>

      {/* Live Ticker */}
      {data?.companies && <TickerBar companies={data.companies.slice(0,8)}/>}

      {/* Control Bar */}
      <div className="sticky top-16 z-40 border-b border-white/5" style={{background:"rgba(3,7,17,0.95)",backdropFilter:"blur(20px)"}}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="font-mono text-xs text-emerald-400">SYSTÈME ACTIF</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/10"/>
            <div className="hidden md:flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-amber-400"/>
              <span className="font-mono text-xs text-amber-400">ADMINISTRATEUR</span>
              <span className="font-mono text-xs text-white/30">— {user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-white/30">{liveTime.toLocaleTimeString("fr-FR")}</span>
            {(s?.pendingTx||0)>0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
                <AlertTriangle className="h-3 w-3"/>
                {s?.pendingTx} EN ATTENTE
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={()=>refetch()} className="text-xs text-white/50 hover:text-amber-400 border border-white/10">
              <RefreshCw className="h-3 w-3 mr-1.5"/>ACTUALISER
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* KPIs Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <div className="col-span-2">
            <KpiCard title="SOLDES PORTEFEUILLES" value={fmtShort(s?.totalBalance||0)+" FCFA"} sub="Total tous membres" icon={Wallet} accent="amber" trend={3.2} loading={isLoading}/>
          </div>
          <div className="col-span-2">
            <KpiCard title="CAPITAL INVESTI" value={fmtShort(s?.totalInvested||0)+" FCFA"} sub="Achats de titres validés" icon={TrendingUp} accent="emerald" trend={8.4} loading={isLoading}/>
          </div>
          <div className="col-span-2">
            <KpiCard title="DÉPÔTS VALIDÉS" value={fmtShort(s?.approvedDeposits||0)+" FCFA"} sub="Total reçu plateforme" icon={ArrowDownLeft} accent="blue" loading={isLoading}/>
          </div>
          <KpiCard title="ENTREPRISES" value={s?.activeCompanies||0} sub={`${s?.companies||0} total`} icon={Building2} accent="purple" loading={isLoading}/>
          <KpiCard title="MEMBRES" value={s?.users||0} sub="Inscrits" icon={Users} accent="cyan" loading={isLoading}/>
        </div>

        {/* KPIs Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="TITRES ÉMIS" value={fmtShort(s?.totalShares||0)} sub="Participations actives" icon={Coins} accent="amber" loading={isLoading}/>
          <KpiCard title="DEMANDES" value={s?.pendingTx||0} sub="En attente de traitement" icon={AlertCircle} accent="rose" loading={isLoading}/>
          <KpiCard title="TX VALIDÉES" value={s?.approvedTx||0} sub={`/${s?.totalTx||0} total`} icon={CheckCircle2} accent="emerald" loading={isLoading}/>
          <KpiCard title="SERVICES PAIEMENT" value={data?.paymentServices?.length||0} sub="Canaux actifs" icon={CreditCard} accent="blue" loading={isLoading}/>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Volume Area Chart */}
          <div className="xl:col-span-2 rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-mono font-bold text-white text-sm tracking-wider">VOLUME DES FLUX — 30 JOURS</h3>
                <p className="text-white/30 text-xs mt-0.5 font-mono">Dépôts · Achats · Retraits · Transferts</p>
              </div>
              <BarChart2 className="h-4 w-4 text-amber-400/50"/>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.txByDay||[]} margin={{top:0,right:0,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="date" tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false} interval={4}/>
                <YAxis tickFormatter={v=>fmtShort(v)} tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false}/>
                <Tooltip
                  formatter={(v:any)=>fmtCurrency(v)}
                  contentStyle={{background:"#0a0f1e",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:11,fontFamily:"monospace"}}
                  labelStyle={{color:"rgba(255,255,255,0.5)"}}
                />
                <Area type="monotone" dataKey="dépôts" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gD)" name="Dépôts"/>
                <Area type="monotone" dataKey="achats" stroke="#10b981" strokeWidth={1.5} fill="url(#gA)" name="Achats"/>
                <Area type="monotone" dataKey="retraits" stroke="#f43f5e" strokeWidth={1.5} fill="url(#gR)" name="Retraits"/>
                <Legend wrapperStyle={{fontSize:10,fontFamily:"monospace",color:"rgba(255,255,255,0.4)"}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie + stats */}
          <div className="space-y-4">
            {/* Sector Pie */}
            <div className="rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
              <h3 className="font-mono font-bold text-white text-sm tracking-wider mb-3">SECTEURS</h3>
              <ResponsiveContainer width="100%" height={140}>
                <RechartsPie>
                  <Pie data={data?.sectorData||[]} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                    {(data?.sectorData||[]).map((_:any,i:number)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:11,fontFamily:"monospace"}}/>
                </RechartsPie>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {(data?.sectorData||[]).map((s:any,i:number)=>(
                  <div key={s.name} className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                      <span className="text-white/40 truncate max-w-[100px]">{s.name}</span>
                    </div>
                    <span className="text-white/70 font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="transactions">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <TabsList className="h-auto p-1 rounded-xl" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
              {[
                {value:"transactions",label:"FLUX",Icon:Zap,badge:s?.pendingTx},
                {value:"companies",label:"ENTREPRISES",Icon:Building2},
                {value:"users",label:"MEMBRES",Icon:Users},
                {value:"shares",label:"TITRES",Icon:Coins},
                {value:"payments",label:"PAIEMENTS",Icon:CreditCard},
              ].map(({value,label,Icon,badge})=>(
                <TabsTrigger key={value} value={value}
                  className="text-[10px] font-mono px-4 py-2 rounded-lg tracking-widest data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-white/30 hover:text-white/60">
                  <Icon className="h-3 w-3 mr-1.5"/>
                  {label}
                  {badge && badge>0 && (
                    <span className="ml-1.5 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">{badge}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── TRANSACTIONS ── */}
          <TabsContent value="transactions" className="mt-4">
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-mono font-bold text-white tracking-wider">GESTION DES FLUX FINANCIERS</h2>
                  <p className="font-mono text-xs text-white/30 mt-0.5">{data?.transactions?.length||0} transactions · {s?.pendingTx||0} en attente</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {["all","pending","approved","rejected"].map(f=>(
                    <button key={f} onClick={()=>setTxFilter(f)}
                      className={`px-3 py-1 rounded-full text-[10px] font-mono border transition-all ${txFilter===f?"bg-amber-500/20 border-amber-500/30 text-amber-400":"border-white/10 text-white/30 hover:text-white/60"}`}>
                      {f==="all"?"TOUS":f==="pending"?"ATTENTE":f==="approved"?"VALIDÉS":"REJETÉS"}
                    </button>
                  ))}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20"/>
                    <input placeholder="Rechercher..." className="pl-8 h-8 w-44 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 font-mono"
                      value={txSearch} onChange={e=>setTxSearch(e.target.value)}/>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      {["TYPE","MONTANT","MEMBRE","RÉFÉRENCE","DATE","STATUT","ACTIONS"].map(h=>(
                        <TableHead key={h} className="text-[10px] font-mono text-white/20 tracking-widest">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.slice(0,60).map(tx=>{
                      const owner = data?.users.find(u=>u.user_id===tx.user_id);
                      const isPending = tx.status==="pending";
                      const typeColor: Record<string,string> = {
                        deposit:"text-emerald-400 bg-emerald-500/10",
                        withdrawal:"text-rose-400 bg-rose-500/10",
                        purchase:"text-blue-400 bg-blue-500/10",
                        sale:"text-purple-400 bg-purple-500/10",
                        transfer:"text-amber-400 bg-amber-500/10",
                      };
                      return (
                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/2 transition-colors">
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${typeColor[tx.type]||"text-white/40"}`}>
                              {tx.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-white text-sm">{fmtCurrency(Number(tx.amount))}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-xs font-mono text-white/80">{owner?.first_name} {owner?.last_name}</p>
                              <p className="text-[10px] font-mono text-amber-400/60">{owner?.msn_id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono text-white/30">{tx.payment_transaction_id||tx.recipient_msn_id||"—"}</TableCell>
                          <TableCell className="text-[10px] font-mono text-white/30">
                            {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                            <br/>
                            <span className="text-white/20">{new Date(tx.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
                          </TableCell>
                          <TableCell><StatusBadge status={tx.status}/></TableCell>
                          <TableCell>
                            {isPending ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={()=>setConfirmDialog({open:true,title:"VALIDER LA DEMANDE",message:`Valider ${tx.type.toUpperCase()} de ${fmtCurrency(Number(tx.amount))} ?`,onConfirm:()=>processTxMutation.mutate({id:tx.id,decision:"approved"})})}
                                  disabled={processTxMutation.isPending}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                                  <CheckCircle2 className="h-3 w-3"/>VALIDER
                                </button>
                                <button
                                  onClick={()=>processTxMutation.mutate({id:tx.id,decision:"rejected"})}
                                  disabled={processTxMutation.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[10px] font-mono hover:bg-rose-500/25 transition-all disabled:opacity-50">
                                  <X className="h-3 w-3"/>
                                </button>
                              </div>
                            ):(
                              <span className="text-[10px] font-mono text-white/20">TRAITÉE</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── COMPANIES ── */}
          <TabsContent value="companies" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20"/>
                  <input placeholder="Rechercher une entreprise..." className="pl-8 h-9 w-64 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 font-mono"
                    value={companySearch} onChange={e=>setCompanySearch(e.target.value)}/>
                </div>
                <button onClick={()=>{setEditingCompanyId(null);setCompanyForm(emptyCompanyForm);setShowCompanyForm(true);}}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-mono hover:bg-amber-500/25 transition-all">
                  <Plus className="h-3.5 w-3.5"/>NOUVELLE ENTREPRISE
                </button>
              </div>
              <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      {["ENTREPRISE","SECTEUR","PRIX/TITRE","TITRES","PROGRESSION","STATUT","ACTIONS"].map(h=>(
                        <TableHead key={h} className="text-[10px] font-mono text-white/20 tracking-widest">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map(company=>{
                      const sold = company.total_shares - company.available_shares;
                      const pct = company.total_shares>0?(sold/company.total_shares)*100:0;
                      return (
                        <TableRow key={company.id} className="border-white/5 hover:bg-white/2 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {company.logo_url?<img src={company.logo_url} alt="" className="w-full h-full object-cover"/>:<Building2 className="h-4 w-4 text-amber-400/50"/>}
                              </div>
                              <div>
                                <p className="text-xs font-mono font-bold text-white/90">{company.name}</p>
                                <p className="text-[10px] font-mono text-white/30">{company.city}, {company.country}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono text-white/40 max-w-[100px] truncate">{company.sector}</TableCell>
                          <TableCell className="font-mono font-bold text-amber-400 text-sm">{Number(company.price_per_share).toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs text-white/50">{company.available_shares.toLocaleString()}<span className="text-white/20">/{company.total_shares.toLocaleString()}</span></TableCell>
                          <TableCell>
                            <div className="w-28">
                              <div className="flex justify-between text-[10px] font-mono text-white/30 mb-1">
                                <span>VENDU</span><span className="text-amber-400">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:"linear-gradient(90deg,#f59e0b,#fbbf24)"}}/>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${company.is_active?"text-emerald-400 bg-emerald-500/10 border-emerald-500/20":"text-white/30 bg-white/5 border-white/10"}`}>
                              {company.is_active?"ACTIF":"MASQUÉ"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              <button onClick={()=>{setEditingCompanyId(company.id);setCompanyForm({name:company.name,registre_commerce:company.registre_commerce,country:company.country,city:company.city,location:company.location,sector:isActivitySector(company.sector)?company.sector:ACTIVITY_SECTORS[0],description:company.description,total_shares:company.total_shares,available_shares:company.available_shares,price_per_share:Number(company.price_per_share),previous_price:Number(company.previous_price),logo_url:company.logo_url||"",video_url:company.video_url||"",is_active:company.is_active});setShowCompanyForm(true);}}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono hover:bg-blue-500/20 transition-all">
                                ÉDITER
                              </button>
                              <button onClick={()=>toggleCompanyMutation.mutate({id:company.id,status:!company.is_active})}
                                disabled={toggleCompanyMutation.isPending}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${company.is_active?"bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20":"bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"}`}>
                                {company.is_active?"MASQUER":"PUBLIER"}
                              </button>
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

          {/* ── USERS ── */}
          <TabsContent value="users" className="mt-4">
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-mono font-bold text-white tracking-wider">REGISTRE DES MEMBRES</h2>
                  <p className="font-mono text-xs text-white/30 mt-0.5">{data?.users?.length||0} membres enregistrés sur la plateforme</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20"/>
                  <input placeholder="Nom, Prénom, MSN-ID..." className="pl-8 h-8 w-52 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 font-mono"
                    value={userSearch} onChange={e=>setUserSearch(e.target.value)}/>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      {["MEMBRE","CONTACT","SOLDE","RÔLES ACTIFS","ATTRIBUTION RÔLE"].map(h=>(
                        <TableHead key={h} className="text-[10px] font-mono text-white/20 tracking-widest">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(profile=>(
                      <TableRow key={profile.user_id} className="border-white/5 hover:bg-white/2 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                              <span className="text-[10px] font-mono font-bold text-amber-400">{profile.first_name?.[0]||"?"}{profile.last_name?.[0]||""}</span>
                            </div>
                            <div>
                              <p className="text-xs font-mono font-bold text-white/90">{profile.first_name} {profile.last_name}</p>
                              <p className="text-[10px] font-mono text-amber-400/60">{profile.msn_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-white/40">{profile.phone||"—"}</TableCell>
                        <TableCell className="font-mono font-bold text-white/80 text-xs">{fmtShort(profile.walletBalance)} FCFA</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {profile.roles.length===0?(
                              <span className="text-[10px] font-mono text-white/20">AUCUN RÔLE</span>
                            ):profile.roles.map((role:string)=>(
                              <div key={`${profile.user_id}-${role}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${ROLE_COLORS[role]||"bg-white/5 text-white/30 border-white/10"}`}>
                                {ROLE_LABELS[role]||role}
                                {role!=="admin"&&(
                                  <button onClick={()=>removeRoleMutation.mutate({userId:profile.user_id,role})} className="hover:opacity-100 opacity-50 transition-opacity">
                                    <X className="h-2.5 w-2.5"/>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <select value={selectedRoles[profile.user_id]||""} onChange={e=>setSelectedRoles(p=>({...p,[profile.user_id]:e.target.value as AppRole}))}
                              className="h-7 px-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white font-mono focus:outline-none focus:border-amber-500/30">
                              <option value="">— RÔLE —</option>
                              {APP_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                            <button
                              onClick={()=>{const r=selectedRoles[profile.user_id];if(r)roleMutation.mutate({userId:profile.user_id,role:r});}}
                              disabled={roleMutation.isPending||!selectedRoles[profile.user_id]}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-mono hover:bg-amber-500/25 transition-all disabled:opacity-30">
                              <Plus className="h-3 w-3"/>ATTRIBUER
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── SHARES ── */}
          <TabsContent value="shares" className="mt-4">
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
              <div className="p-4 border-b border-white/5">
                <h2 className="font-mono font-bold text-white tracking-wider">REGISTRE DES PARTICIPATIONS</h2>
                <p className="font-mono text-xs text-white/30 mt-0.5">{data?.shares?.length||0} lignes · {fmtShort(s?.totalShares||0)} titres au total</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      {["ENTREPRISE","PROPRIÉTAIRE","N° ORDRE","QTÉ","PRIX ACHAT","VALEUR ACTUELLE","DATE"].map(h=>(
                        <TableHead key={h} className="text-[10px] font-mono text-white/20 tracking-widest">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.shares||[]).slice(0,80).map(sh=>{
                      const currentPrice = Number((sh.companies as any)?.price_per_share||sh.purchase_price);
                      const value = currentPrice*sh.quantity;
                      const gain = (currentPrice-Number(sh.purchase_price))*sh.quantity;
                      return (
                        <TableRow key={sh.id} className="border-white/5 hover:bg-white/2 transition-colors">
                          <TableCell className="text-xs font-mono font-bold text-white/80">{(sh.companies as any)?.name||"—"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-xs font-mono text-white/70">{sh.owner?.first_name} {sh.owner?.last_name}</p>
                              <p className="text-[10px] font-mono text-amber-400/50">{sh.owner?.msn_id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono text-white/30">{sh.order_number}</TableCell>
                          <TableCell className="font-mono font-bold text-amber-400">{sh.quantity}</TableCell>
                          <TableCell className="font-mono text-xs text-white/40">{Number(sh.purchase_price).toLocaleString()}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono font-bold text-white/80 text-xs">{fmtShort(value)} FCFA</p>
                              <p className={`text-[10px] font-mono ${gain>=0?"text-emerald-400":"text-rose-400"}`}>
                                {gain>=0?"+":""}{fmtShort(gain)} FCFA
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono text-white/30">{new Date(sh.purchase_date).toLocaleDateString("fr-FR")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── PAYMENTS ── */}
          <TabsContent value="payments" className="mt-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-white/5 p-6 space-y-4" style={{background:"rgba(255,255,255,0.02)"}}>
                <h2 className="font-mono font-bold text-white tracking-wider">NOUVEAU SERVICE DE PAIEMENT</h2>
                <input placeholder="Nom du service" value={serviceForm.name} onChange={e=>setServiceForm(p=>({...p,name:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"/>
                <input placeholder="Contact (numéro, email...)" value={serviceForm.contact} onChange={e=>setServiceForm(p=>({...p,contact:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"/>
                <input placeholder="Lien de paiement (optionnel)" value={serviceForm.payment_link} onChange={e=>setServiceForm(p=>({...p,payment_link:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"/>
                <textarea placeholder="Instructions" value={serviceForm.instructions} onChange={e=>setServiceForm(p=>({...p,instructions:e.target.value}))} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 resize-none"/>
                <button onClick={()=>serviceMutation.mutate()} disabled={serviceMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-mono tracking-widest hover:bg-amber-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {serviceMutation.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Plus className="h-4 w-4"/>}
                  AJOUTER LE SERVICE
                </button>
              </div>
              <div className="rounded-2xl border border-white/5 p-6" style={{background:"rgba(255,255,255,0.02)"}}>
                <h2 className="font-mono font-bold text-white tracking-wider mb-4">SERVICES ACTIFS ({data?.paymentServices?.length||0})</h2>
                <div className="space-y-3">
                  {(data?.paymentServices||[]).map(svc=>(
                    <div key={svc.id} className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-amber-500/20 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono font-bold text-white/90 text-sm">{svc.name}</p>
                          <p className="font-mono text-xs text-white/40 mt-0.5">{svc.contact}</p>
                          {svc.instructions&&<p className="font-mono text-[10px] text-white/25 mt-1">{svc.instructions}</p>}
                          {svc.payment_link&&<a href={svc.payment_link} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-amber-400 hover:underline mt-1 block">→ LIEN DE PAIEMENT</a>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${svc.is_active?"text-emerald-400 bg-emerald-500/10 border-emerald-500/20":"text-white/20 bg-white/5 border-white/10"}`}>
                          {svc.is_active?"ACTIF":"INACTIF"}
                        </span>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{background:"#0a0f1e",border:"1px solid rgba(245,158,11,0.15)"}}>
          <DialogHeader>
            <DialogTitle className="font-mono text-amber-400 tracking-wider">
              {editingCompanyId?"MODIFIER L'ENTREPRISE":"NOUVELLE ENTREPRISE PARTENAIRE"}
            </DialogTitle>
            <DialogDescription className="font-mono text-white/30 text-xs">
              Renseignez les informations de la société et ses paramètres de participation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              {placeholder:"Nom de l'entreprise *",key:"name",col:2},
              {placeholder:"Registre de commerce *",key:"registre_commerce"},
              {placeholder:"Pays *",key:"country"},
              {placeholder:"Ville *",key:"city"},
              {placeholder:"Localisation précise",key:"location",col:2},
            ].map(({placeholder,key,col})=>(
              <div key={key} className={col===2?"col-span-2":""}>
                <input placeholder={placeholder} value={(companyForm as any)[key]} onChange={e=>setCompanyForm(p=>({...p,[key]:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-amber-500/30"/>
              </div>
            ))}
            <select value={companyForm.sector} onChange={e=>setCompanyForm(p=>({...p,sector:isActivitySector(e.target.value)?e.target.value:ACTIVITY_SECTORS[0]}))}
              className="col-span-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-amber-500/30">
              {ACTIVITY_SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <textarea placeholder="Description de l'entreprise" value={companyForm.description} onChange={e=>setCompanyForm(p=>({...p,description:e.target.value}))} rows={3}
              className="col-span-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-amber-500/30 resize-none"/>
            {[
              {placeholder:"Total titres",key:"total_shares"},
              {placeholder:"Titres disponibles",key:"available_shares"},
              {placeholder:"Prix actuel (FCFA)",key:"price_per_share"},
              {placeholder:"Prix précédent (FCFA)",key:"previous_price"},
            ].map(({placeholder,key})=>(
              <input key={key} type="number" placeholder={placeholder} value={(companyForm as any)[key]} onChange={e=>setCompanyForm(p=>({...p,[key]:Number(e.target.value)}))}
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-amber-500/30"/>
            ))}
            <div className="col-span-2">
              <ImageUpload value={companyForm.logo_url} onChange={url=>setCompanyForm(p=>({...p,logo_url:url}))} folder="logos" label="Logo de l'entreprise"/>
            </div>
            <input placeholder="URL vidéo de présentation" value={companyForm.video_url} onChange={e=>setCompanyForm(p=>({...p,video_url:e.target.value}))}
              className="col-span-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-amber-500/30"/>
          </div>
          <DialogFooter>
            <button onClick={()=>setShowCompanyForm(false)} className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-mono hover:border-white/20 transition-all">ANNULER</button>
            <button onClick={()=>companyMutation.mutate()} disabled={companyMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-mono hover:bg-amber-500/25 transition-all disabled:opacity-50">
              {companyMutation.isPending&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}
              {editingCompanyId?"METTRE À JOUR":"CRÉER L'ENTREPRISE"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog?.open||false} onOpenChange={()=>setConfirmDialog(null)}>
        <DialogContent className="max-w-sm" style={{background:"#0a0f1e",border:"1px solid rgba(245,158,11,0.15)"}}>
          <DialogHeader>
            <DialogTitle className="font-mono text-amber-400 tracking-wider">{confirmDialog?.title}</DialogTitle>
            <DialogDescription className="font-mono text-white/50 text-xs mt-2">{confirmDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={()=>setConfirmDialog(null)} className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-mono hover:border-white/20 transition-all">ANNULER</button>
            <button onClick={()=>{confirmDialog?.onConfirm();setConfirmDialog(null);}}
              className="px-6 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-mono hover:bg-emerald-500/25 transition-all">
              CONFIRMER
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
