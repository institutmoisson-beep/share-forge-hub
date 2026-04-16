import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, TrendingUp, TrendingDown, Coins, ArrowDownLeft, ArrowUpRight,
  ArrowLeftRight, Building2, Clock, CheckCircle2, XCircle, Plus, Minus,
  RefreshCw, Eye, ChevronRight, Activity, CreditCard, Send, Download,
  BarChart3, PieChart, Loader2, X, AlertCircle, Hash,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, PieChart as RechartsPie, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokePlatformAction } from "@/lib/platform-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PIE_COLORS = ["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#06b6d4"];

const fmtCurrency = (v:number) => new Intl.NumberFormat("fr-FR").format(v)+" FCFA";
const fmtShort = (v:number) => v>=1_000_000?(v/1_000_000).toFixed(2)+"M":v>=1_000?(v/1_000).toFixed(0)+"K":String(v);

const StatusBadge = ({status}:{status:string}) => {
  const map:{[k:string]:[string,string]} = {
    approved:["VALIDÉ","text-emerald-400 bg-emerald-500/10 border-emerald-500/20"],
    pending:["EN ATTENTE","text-amber-400 bg-amber-500/10 border-amber-500/20"],
    rejected:["REJETÉ","text-rose-400 bg-rose-500/10 border-rose-500/20"],
  };
  const [label,cls] = map[status]||[status,"text-gray-400 bg-gray-500/10 border-gray-500/20"];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${cls}`}>{label}</span>;
};

const MemberDashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [depositDialog, setDepositDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [p2pDialog, setP2pDialog] = useState(false);
  const [selectedShare, setSelectedShare] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [paymentContact, setPaymentContact] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferDesc, setTransferDesc] = useState("");
  const [p2pPrice, setP2pPrice] = useState("");
  const [p2pQty, setP2pQty] = useState("");
  const [activeTab, setActiveTab] = useState<"overview"|"portfolio"|"transactions"|"market">("overview");
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(()=>{const t=setInterval(()=>setLiveTime(new Date()),1000);return()=>clearInterval(t);},[]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallets").select("*").eq("user_id", user!.id).single();
      if(error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: shares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ["user_shares", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_shares").select("*, companies(name, price_per_share, sector, logo_url)").eq("user_id", user!.id).order("purchase_date", { ascending: false });
      if(error) throw error;
      return data||[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      if(!wallet?.id) return [];
      const { data, error } = await supabase.from("wallet_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
      if(error) throw error;
      return data||[];
    },
    enabled: !!user && !!wallet,
  });

  const { data: paymentServices = [] } = useQuery({
    queryKey: ["payment-services"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_services").select("*").eq("is_active", true);
      return data||[];
    },
  });

  const { data: activeListings = [] } = useQuery({
    queryKey: ["my-active-listings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("p2p_listings").select("*, companies(name)").eq("seller_id", user!.id).eq("status", "active");
      return data||[];
    },
    enabled: !!user,
  });

  // Portfolio stats
  const portfolioValue = shares.reduce((s,sh) => s + Number((sh.companies as any)?.price_per_share||sh.purchase_price)*sh.quantity, 0);
  const portfolioCost  = shares.reduce((s,sh) => s + Number(sh.purchase_price)*sh.quantity, 0);
  const portfolioGain  = portfolioValue - portfolioCost;
  const portfolioPct   = portfolioCost > 0 ? ((portfolioGain/portfolioCost)*100).toFixed(2) : "0.00";
  const balance = Number(wallet?.balance||0);
  const totalAssets = balance + portfolioValue;

  // Sector pie
  const sectorMap: Record<string,number> = {};
  shares.forEach(sh => {
    const sec = (sh.companies as any)?.sector||"Autre";
    sectorMap[sec] = (sectorMap[sec]||0) + Number((sh.companies as any)?.price_per_share||sh.purchase_price)*sh.quantity;
  });
  const pieData = Object.entries(sectorMap).map(([name,value])=>({name,value}));

  // Performance chart (simulated from tx history)
  const now = new Date();
  const perfData = Array.from({length:14},(_,i)=>{
    const d = new Date(now); d.setDate(d.getDate()-(13-i));
    const key = d.toISOString().slice(0,10);
    const dayTx = transactions.filter(t=>t.created_at.slice(0,10)===key);
    const deposits = dayTx.filter(t=>t.type==="deposit"&&t.status==="approved").reduce((s,t)=>s+Number(t.amount),0);
    const purchases = dayTx.filter(t=>t.type==="purchase").reduce((s,t)=>s+Number(t.amount),0);
    return { date: d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}), dépôts: deposits, investissements: purchases };
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      if(!amount||Number(amount)<=0) throw new Error("Montant invalide.");
      if(!selectedService) throw new Error("Sélectionnez un service de paiement.");
      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user!.id, wallet_id: wallet!.id, type: "deposit",
        amount: Number(amount), status: "pending",
        payment_service_id: selectedService||null,
        payment_contact: paymentContact||null,
        payment_transaction_id: paymentRef||null,
        description: `Dépôt via ${paymentServices.find(s=>s.id===selectedService)?.name||"service"}`,
      });
      if(error) throw error;
    },
    onSuccess: async () => {
      toast.success("Demande de dépôt soumise. En attente de validation.");
      setDepositDialog(false); setAmount(""); setSelectedService(""); setPaymentContact(""); setPaymentRef("");
      await queryClient.invalidateQueries({queryKey:["transactions",user?.id]});
    },
    onError: (e:Error) => toast.error(e.message),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if(!amount||Number(amount)<=0) throw new Error("Montant invalide.");
      if(Number(amount)>balance) throw new Error("Solde insuffisant.");
      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user!.id, wallet_id: wallet!.id, type: "withdrawal",
        amount: Number(amount), status: "pending",
        payment_contact: paymentContact||null,
        description: `Retrait vers ${paymentContact||"compte"}`,
      });
      if(error) throw error;
    },
    onSuccess: async () => {
      toast.success("Demande de retrait soumise. En attente de validation.");
      setWithdrawDialog(false); setAmount(""); setPaymentContact("");
      await queryClient.invalidateQueries({queryKey:["transactions",user?.id]});
    },
    onError: (e:Error) => toast.error(e.message),
  });

  const transferMutation = useMutation({
    mutationFn: () => invokePlatformAction("transfer_money", {
      recipientMsnId: transferRecipient, amount: Number(amount), description: transferDesc,
    }),
    onSuccess: async () => {
      toast.success("Transfert effectué avec succès.");
      setTransferDialog(false); setAmount(""); setTransferRecipient(""); setTransferDesc("");
      await queryClient.invalidateQueries({queryKey:["wallet",user?.id]});
      await queryClient.invalidateQueries({queryKey:["transactions",user?.id]});
    },
    onError: (e:Error) => toast.error(e.message),
  });

  const p2pMutation = useMutation({
    mutationFn: () => invokePlatformAction("create_listing", {
      userShareId: selectedShare?.id, quantity: Number(p2pQty), pricePerShare: Number(p2pPrice),
    }),
    onSuccess: async () => {
      toast.success("Annonce publiée sur le marché secondaire.");
      setP2pDialog(false); setP2pPrice(""); setP2pQty(""); setSelectedShare(null);
      await queryClient.invalidateQueries({queryKey:["user_shares"]});
      await queryClient.invalidateQueries({queryKey:["my-active-listings"]});
    },
    onError: (e:Error) => toast.error(e.message),
  });

  const txTypeStyle: Record<string,[string,string]> = {
    deposit:["DÉPÔT","text-emerald-400"],
    withdrawal:["RETRAIT","text-rose-400"],
    purchase:["ACHAT","text-blue-400"],
    sale:["VENTE","text-purple-400"],
    transfer:["TRANSFERT","text-amber-400"],
  };

  return (
    <div className="min-h-screen" style={{background:"linear-gradient(135deg,#030711 0%,#050d1a 50%,#030711 100%)"}}>
      <Navbar/>

      {/* Header */}
      <div className="pt-20 pb-4 border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-amber-400/60 tracking-widest mb-1">ESPACE INVESTISSEUR</p>
              <h1 className="font-mono font-bold text-xl text-white">
                {profile?.first_name||"Membre"} {profile?.last_name||""}
              </h1>
              <p className="font-mono text-xs text-white/30 mt-0.5">{profile?.msn_id||"—"} · {liveTime.toLocaleTimeString("fr-FR")}</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="font-mono text-xs text-white/30">ACTIFS TOTAUX</p>
                <p className="font-mono font-bold text-2xl text-amber-400">{fmtShort(totalAssets)} FCFA</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-5 flex-wrap">
            {[
              {label:"DÉPÔT",Icon:ArrowDownLeft,color:"emerald",fn:()=>setDepositDialog(true)},
              {label:"RETRAIT",Icon:ArrowUpRight,color:"rose",fn:()=>setWithdrawDialog(true)},
              {label:"TRANSFERT",Icon:ArrowLeftRight,color:"amber",fn:()=>setTransferDialog(true)},
              {label:"VENDRE",Icon:Send,color:"purple",fn:()=>{setSelectedShare(shares[0]||null);setP2pDialog(true);}},
              {label:"EXPLORER",Icon:Building2,color:"blue",fn:()=>navigate("/entreprises")},
            ].map(({label,Icon,color,fn})=>{
              const cls:{[k:string]:string}={
                emerald:"bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
                rose:"bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20",
                amber:"bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20",
                purple:"bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20",
                blue:"bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
              };
              return (
                <button key={label} onClick={fn} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono transition-all ${cls[color]}`}>
                  <Icon className="h-3.5 w-3.5"/>{label}
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 overflow-x-auto">
            {[
              {k:"overview",l:"APERÇU"},
              {k:"portfolio",l:"PORTEFEUILLE"},
              {k:"transactions",l:"TRANSACTIONS"},
              {k:"market",l:"MARCHÉ P2P"},
            ].map(({k,l})=>(
              <button key={k} onClick={()=>setActiveTab(k as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-mono tracking-widest transition-all ${activeTab===k?"bg-amber-500/20 text-amber-400 border border-amber-500/30":"text-white/30 hover:text-white/60 border border-transparent"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">

        {/* OVERVIEW */}
        {activeTab==="overview" && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:"SOLDE DISPONIBLE",value:fmtShort(balance)+" FCFA",sub:"Liquidités",color:"amber",loading:walletLoading},
                {label:"VALEUR PORTEFEUILLE",value:fmtShort(portfolioValue)+" FCFA",sub:`${shares.length} ligne(s)`,color:"emerald"},
                {label:"PLUS/MOINS VALUE",value:(portfolioGain>=0?"+":"")+fmtShort(portfolioGain)+" FCFA",sub:`${portfolioPct}%`,color:portfolioGain>=0?"emerald":"rose"},
                {label:"ACTIFS TOTAUX",value:fmtShort(totalAssets)+" FCFA",sub:"Liquide + Investi",color:"blue"},
              ].map(({label,value,sub,color,loading})=>{
                const cls:{[k:string]:string}={
                  amber:"border-amber-500/20 from-amber-500/10",
                  emerald:"border-emerald-500/20 from-emerald-500/10",
                  rose:"border-rose-500/20 from-rose-500/10",
                  blue:"border-blue-500/20 from-blue-500/10",
                };
                return (
                  <div key={label} className={`rounded-2xl border bg-gradient-to-br to-transparent p-5 ${cls[color]}`}>
                    {loading ? <div className="h-6 w-24 bg-white/5 rounded animate-pulse"/> : (
                      <>
                        <p className="font-mono text-[10px] text-white/30 tracking-widest mb-1">{label}</p>
                        <p className="font-mono font-bold text-white text-xl">{value}</p>
                        <p className="font-mono text-[10px] text-white/30 mt-0.5">{sub}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
                <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest mb-4">ACTIVITÉ FINANCIÈRE — 14 JOURS</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={perfData}>
                    <defs>
                      <linearGradient id="gMD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gMI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="date" tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false}/>
                    <YAxis tickFormatter={v=>fmtShort(v)} tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false}/>
                    <Tooltip formatter={(v:any)=>fmtCurrency(v)} contentStyle={{background:"#0a0f1e",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:10,fontFamily:"monospace"}} labelStyle={{color:"rgba(255,255,255,0.4)"}}/>
                    <Area type="monotone" dataKey="dépôts" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gMD)" name="Dépôts"/>
                    <Area type="monotone" dataKey="investissements" stroke="#10b981" strokeWidth={1.5} fill="url(#gMI)" name="Investissements"/>
                    <Legend wrapperStyle={{fontSize:10,fontFamily:"monospace",color:"rgba(255,255,255,0.4)"}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {pieData.length > 0 && (
                <div className="rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
                  <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest mb-3">RÉPARTITION SECTORIELLE</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <RechartsPie>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                        {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v:any)=>fmtCurrency(v)} contentStyle={{background:"#0a0f1e",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:10,fontFamily:"monospace"}}/>
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {pieData.slice(0,4).map((s,i)=>(
                      <div key={s.name} className="flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                          <span className="text-white/40 truncate max-w-[100px]">{s.name}</span>
                        </div>
                        <span className="text-white/60 font-bold">{fmtShort(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recent transactions */}
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest">DERNIÈRES TRANSACTIONS</h3>
                <button onClick={()=>setActiveTab("transactions")} className="font-mono text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors">VOIR TOUT →</button>
              </div>
              <div className="divide-y divide-white/5">
                {transactions.slice(0,5).map(tx=>{
                  const [label,color] = txTypeStyle[tx.type]||[tx.type,"text-white/40"];
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type==="deposit"?"bg-emerald-500/10":tx.type==="withdrawal"?"bg-rose-500/10":tx.type==="purchase"?"bg-blue-500/10":"bg-amber-500/10"}`}>
                          {tx.type==="deposit"?<ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400"/>:tx.type==="withdrawal"?<ArrowUpRight className="h-3.5 w-3.5 text-rose-400"/>:tx.type==="purchase"?<Coins className="h-3.5 w-3.5 text-blue-400"/>:<ArrowLeftRight className="h-3.5 w-3.5 text-amber-400"/>}
                        </div>
                        <div>
                          <p className={`font-mono text-xs font-bold ${color}`}>{label}</p>
                          <p className="font-mono text-[10px] text-white/30">{tx.description||"—"} · {new Date(tx.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold text-sm ${tx.type==="withdrawal"||tx.type==="purchase"?"text-rose-400":"text-emerald-400"}`}>
                          {tx.type==="withdrawal"||tx.type==="purchase"?"-":"+"}{fmtShort(Number(tx.amount))} FCFA
                        </p>
                        <StatusBadge status={tx.status}/>
                      </div>
                    </div>
                  );
                })}
                {transactions.length===0&&<div className="p-8 text-center font-mono text-xs text-white/20">AUCUNE TRANSACTION</div>}
              </div>
            </div>
          </div>
        )}

        {/* PORTFOLIO */}
        {activeTab==="portfolio" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                {l:"VALEUR TOTALE",v:fmtShort(portfolioValue)+" FCFA"},
                {l:"P&L TOTAL",v:(portfolioGain>=0?"+":"")+fmtShort(portfolioGain)+" FCFA"},
                {l:"RENDEMENT",v:portfolioPct+"%"},
              ].map(({l,v})=>(
                <div key={l} className="rounded-xl border border-white/5 p-4" style={{background:"rgba(255,255,255,0.02)"}}>
                  <p className="font-mono text-[10px] text-white/30 tracking-widest">{l}</p>
                  <p className={`font-mono font-bold text-lg mt-1 ${v.startsWith("-")?"text-rose-400":v.startsWith("+")?"text-emerald-400":"text-white"}`}>{v}</p>
                </div>
              ))}
            </div>
            {sharesLoading ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-xl bg-white/3 animate-pulse"/>)}</div>
            ) : shares.length===0 ? (
              <div className="text-center py-16 rounded-2xl border border-white/5" style={{background:"rgba(255,255,255,0.02)"}}>
                <Coins className="h-12 w-12 text-white/10 mx-auto mb-3"/>
                <p className="font-mono text-white/30 text-sm">AUCUN TITRE EN PORTEFEUILLE</p>
                <button onClick={()=>navigate("/entreprises")} className="mt-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono hover:bg-amber-500/20 transition-all">
                  EXPLORER LES ENTREPRISES →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map(sh=>{
                  const cp = Number((sh.companies as any)?.price_per_share||sh.purchase_price);
                  const pp = Number(sh.purchase_price);
                  const val = cp*sh.quantity;
                  const cost = pp*sh.quantity;
                  const gain = val-cost;
                  const pct = cost>0?((gain/cost)*100).toFixed(2):"0";
                  const up = gain>=0;
                  return (
                    <div key={sh.id} className="rounded-2xl border border-white/5 p-5 hover:border-amber-500/15 transition-all" style={{background:"rgba(255,255,255,0.02)"}}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            {(sh.companies as any)?.logo_url?<img src={(sh.companies as any).logo_url} alt="" className="w-full h-full object-cover"/>:<Building2 className="h-4 w-4 text-amber-400/50"/>}
                          </div>
                          <div>
                            <p className="font-mono font-bold text-white/90 text-sm">{(sh.companies as any)?.name||"—"}</p>
                            <p className="font-mono text-[10px] text-white/30">{(sh.companies as any)?.sector||"—"} · {sh.order_number}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="text-right">
                            <p className="font-mono text-[10px] text-white/30">QUANTITÉ</p>
                            <p className="font-mono font-bold text-amber-400">{sh.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-[10px] text-white/30">PRIX ACHAT</p>
                            <p className="font-mono text-xs text-white/60">{pp.toLocaleString()} FCFA</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-[10px] text-white/30">VALEUR ACTUELLE</p>
                            <p className="font-mono font-bold text-white">{fmtShort(val)} FCFA</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-[10px] text-white/30">P&L</p>
                            <p className={`font-mono font-bold text-sm ${up?"text-emerald-400":"text-rose-400"}`}>
                              {up?"+":""}{fmtShort(gain)} FCFA
                            </p>
                            <p className={`font-mono text-[10px] ${up?"text-emerald-400/60":"text-rose-400/60"}`}>{up?"+":""}{pct}%</p>
                          </div>
                          <button onClick={()=>{setSelectedShare(sh);setP2pQty(String(sh.quantity));setP2pPrice(String(cp));setP2pDialog(true);}}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono hover:bg-purple-500/20 transition-all">
                            VENDRE P2P
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS */}
        {activeTab==="transactions" && (
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
            <div className="p-4 border-b border-white/5">
              <h2 className="font-mono font-bold text-white/70 tracking-wider text-xs">HISTORIQUE DES TRANSACTIONS</h2>
              <p className="font-mono text-[10px] text-white/20 mt-0.5">{transactions.length} opérations enregistrées</p>
            </div>
            <div className="divide-y divide-white/5">
              {txLoading ? (
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 text-amber-400 animate-spin mx-auto"/></div>
              ) : transactions.length===0 ? (
                <div className="p-8 text-center font-mono text-xs text-white/20">AUCUNE TRANSACTION</div>
              ) : transactions.map(tx=>{
                const [label,color] = txTypeStyle[tx.type]||[tx.type,"text-white/40"];
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-white/2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type==="deposit"?"bg-emerald-500/10":tx.type==="withdrawal"?"bg-rose-500/10":tx.type==="purchase"?"bg-blue-500/10":tx.type==="sale"?"bg-purple-500/10":"bg-amber-500/10"}`}>
                        {tx.type==="deposit"?<ArrowDownLeft className="h-4 w-4 text-emerald-400"/>:tx.type==="withdrawal"?<ArrowUpRight className="h-4 w-4 text-rose-400"/>:tx.type==="purchase"?<Coins className="h-4 w-4 text-blue-400"/>:tx.type==="sale"?<Send className="h-4 w-4 text-purple-400"/>:<ArrowLeftRight className="h-4 w-4 text-amber-400"/>}
                      </div>
                      <div>
                        <p className={`font-mono text-xs font-bold ${color}`}>{label}</p>
                        <p className="font-mono text-[10px] text-white/25">{tx.description||"—"}</p>
                        <p className="font-mono text-[10px] text-white/20">{new Date(tx.created_at).toLocaleDateString("fr-FR")} {new Date(tx.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-bold ${["withdrawal","purchase"].includes(tx.type)?"text-rose-400":"text-emerald-400"}`}>
                        {["withdrawal","purchase"].includes(tx.type)?"-":"+"}{fmtCurrency(Number(tx.amount))}
                      </p>
                      <div className="mt-1"><StatusBadge status={tx.status}/></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MARKET P2P */}
        {activeTab==="market" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono font-bold text-white/70 tracking-wider text-xs">MES ANNONCES ACTIVES ({activeListings.length})</h2>
              <button onClick={()=>{setSelectedShare(shares[0]||null);setP2pDialog(true);}}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono hover:bg-purple-500/20 transition-all">
                <Plus className="h-3.5 w-3.5"/>NOUVELLE ANNONCE
              </button>
            </div>
            {activeListings.length===0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/5" style={{background:"rgba(255,255,255,0.02)"}}>
                <ArrowLeftRight className="h-10 w-10 text-white/10 mx-auto mb-3"/>
                <p className="font-mono text-white/30 text-xs">AUCUNE ANNONCE EN COURS</p>
              </div>
            ) : activeListings.map(l=>(
              <div key={l.id} className="rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-white/90">{(l.companies as any)?.name}</p>
                    <p className="font-mono text-[10px] text-white/30">{l.quantity} titre(s) · {Number(l.price_per_share).toLocaleString()} FCFA/titre</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-purple-400">{fmtShort(l.quantity*Number(l.price_per_share))} FCFA</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400">ACTIVE</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4">
              <Link to="/marketplace" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono hover:bg-amber-500/20 transition-all w-fit">
                VOIR LE MARCHÉ SECONDAIRE COMPLET →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ─── DEPOSIT DIALOG ─── */}
      <Dialog open={depositDialog} onOpenChange={setDepositDialog}>
        <DialogContent style={{background:"#0a0f1e",border:"1px solid rgba(16,185,129,0.2)"}}>
          <DialogHeader>
            <DialogTitle className="font-mono text-emerald-400 tracking-wider">DEMANDE DE DÉPÔT</DialogTitle>
            <DialogDescription className="font-mono text-white/30 text-xs">Votre demande sera validée par un administrateur après vérification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">SERVICE DE PAIEMENT *</label>
              <select value={selectedService} onChange={e=>setSelectedService(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/30">
                <option value="">— Sélectionner —</option>
                {paymentServices.map(s=><option key={s.id} value={s.id}>{s.name} ({s.contact})</option>)}
              </select>
              {selectedService && paymentServices.find(s=>s.id===selectedService)?.instructions && (
                <p className="font-mono text-[10px] text-amber-400/60 mt-1.5">
                  ℹ {paymentServices.find(s=>s.id===selectedService)?.instructions}
                </p>
              )}
            </div>
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">MONTANT (FCFA) *</label>
              <input type="number" placeholder="Ex: 50000" value={amount} onChange={e=>setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30"/>
            </div>
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">N° CONTACT EXPÉDITEUR</label>
              <input placeholder="Ex: +237 6XX XXX XXX" value={paymentContact} onChange={e=>setPaymentContact(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30"/>
            </div>
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">RÉFÉRENCE DE TRANSACTION</label>
              <input placeholder="ID/Référence du transfert" value={paymentRef} onChange={e=>setPaymentRef(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30"/>
            </div>
          </div>
          <DialogFooter>
            <button onClick={()=>setDepositDialog(false)} className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-mono">ANNULER</button>
            <button onClick={()=>depositMutation.mutate()} disabled={depositMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-mono hover:bg-emerald-500/25 transition-all disabled:opacity-50">
              {depositMutation.isPending&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}SOUMETTRE
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── WITHDRAW DIALOG ─── */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent style={{background:"#0a0f1e",border:"1px solid rgba(244,63,94,0.2)"}}>
          <DialogHeader>
            <DialogTitle className="font-mono text-rose-400 tracking-wider">DEMANDE DE RETRAIT</DialogTitle>
            <DialogDescription className="font-mono text-white/30 text-xs">Solde disponible : {fmtCurrency(balance)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">MONTANT (FCFA) *</label>
              <input type="number" placeholder="Ex: 25000" value={amount} onChange={e=>setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-rose-500/30"/>
              {amount && Number(amount)>balance && <p className="font-mono text-[10px] text-rose-400 mt-1">⚠ Solde insuffisant</p>}
            </div>
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">COMPTE DESTINATAIRE *</label>
              <input placeholder="N° téléphone ou compte" value={paymentContact} onChange={e=>setPaymentContact(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-rose-500/30"/>
            </div>
          </div>
          <DialogFooter>
            <button onClick={()=>setWithdrawDialog(false)} className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-mono">ANNULER</button>
            <button onClick={()=>withdrawMutation.mutate()} disabled={withdrawMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs font-mono hover:bg-rose-500/25 transition-all disabled:opacity-50">
              {withdrawMutation.isPending&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}SOUMETTRE
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── TRANSFER DIALOG ─── */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent style={{background:"#0a0f1e",border:"1px solid rgba(245,158,11,0.2)"}}>
          <DialogHeader>
            <DialogTitle className="font-mono text-amber-400 tracking-wider">TRANSFERT ENTRE MEMBRES</DialogTitle>
            <DialogDescription className="font-mono text-white/30 text-xs">Envoyez des fonds à un autre membre MSN via son identifiant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">ID DESTINATAIRE (MSN-HC-XXXXXX) *</label>
              <input placeholder="Ex: MSN-HC-000123" value={transferRecipient} onChange={e=>setTransferRecipient(e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"/>
            </div>
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">MONTANT (FCFA) *</label>
              <input type="number" placeholder="Ex: 10000" value={amount} onChange={e=>setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"/>
            </div>
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">MOTIF (OPTIONNEL)</label>
              <input placeholder="Motif du transfert" value={transferDesc} onChange={e=>setTransferDesc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"/>
            </div>
          </div>
          <DialogFooter>
            <button onClick={()=>setTransferDialog(false)} className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-mono">ANNULER</button>
            <button onClick={()=>transferMutation.mutate()} disabled={transferMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-mono hover:bg-amber-500/25 transition-all disabled:opacity-50">
              {transferMutation.isPending&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}TRANSFÉRER
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── P2P DIALOG ─── */}
      <Dialog open={p2pDialog} onOpenChange={setP2pDialog}>
        <DialogContent style={{background:"#0a0f1e",border:"1px solid rgba(168,85,247,0.2)"}}>
          <DialogHeader>
            <DialogTitle className="font-mono text-purple-400 tracking-wider">VENTE SUR LE MARCHÉ P2P</DialogTitle>
            <DialogDescription className="font-mono text-white/30 text-xs">Publiez vos titres sur le marché secondaire entre membres.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-white/30 block mb-1.5">LIGNE DE TITRES *</label>
              <select value={selectedShare?.id||""} onChange={e=>{const sh=shares.find(s=>s.id===e.target.value);setSelectedShare(sh||null);if(sh){setP2pQty(String(sh.quantity));setP2pPrice(String(Number((sh.companies as any)?.price_per_share||sh.purchase_price)));}}}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-purple-500/30">
                <option value="">— Sélectionner —</option>
                {shares.map(s=><option key={s.id} value={s.id}>{(s.companies as any)?.name||"?"} · {s.quantity} titre(s)</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] text-white/30 block mb-1.5">QUANTITÉ *</label>
                <input type="number" placeholder="Ex: 10" value={p2pQty} onChange={e=>setP2pQty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-purple-500/30"/>
              </div>
              <div>
                <label className="font-mono text-[10px] text-white/30 block mb-1.5">PRIX/TITRE (FCFA) *</label>
                <input type="number" placeholder="Ex: 15000" value={p2pPrice} onChange={e=>setP2pPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-purple-500/30"/>
              </div>
            </div>
            {p2pPrice && p2pQty && (
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/15 p-3">
                <p className="font-mono text-[10px] text-white/40">MONTANT TOTAL DE L'ANNONCE</p>
                <p className="font-mono font-bold text-purple-400 text-lg">{fmtCurrency(Number(p2pPrice)*Number(p2pQty))}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={()=>setP2pDialog(false)} className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-mono">ANNULER</button>
            <button onClick={()=>p2pMutation.mutate()} disabled={p2pMutation.isPending||!selectedShare}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs font-mono hover:bg-purple-500/25 transition-all disabled:opacity-50">
              {p2pMutation.isPending&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}PUBLIER L'ANNONCE
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDashboard;
