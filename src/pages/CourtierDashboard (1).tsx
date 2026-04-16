import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, Users, Coins, BarChart3, Target, Award, Clock,
  Building2, ArrowUpRight, Activity, ChevronRight, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar,
} from "recharts";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const fmtCurrency = (v:number) => new Intl.NumberFormat("fr-FR").format(v)+" FCFA";
const fmtShort = (v:number) => v>=1_000_000?(v/1_000_000).toFixed(2)+"M":v>=1_000?(v/1_000).toFixed(0)+"K":String(v);

const CourtierDashboard = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview"|"sales"|"objectives"|"clients">("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["courtier-dashboard", user?.id],
    queryFn: async () => {
      const [salesRes, objectivesRes, companiesRes, sharesRes] = await Promise.all([
        supabase.from("broker_sales").select("*, companies(name, price_per_share)").eq("broker_id", user!.id).order("created_at", {ascending:false}),
        supabase.from("broker_objectives").select("*, companies(name)").eq("broker_id", user!.id).order("created_at", {ascending:false}),
        supabase.from("companies").select("*, broker_commissions(commission_rate, fixed_commission)").eq("is_active", true),
        supabase.from("user_shares").select("*, companies(name, price_per_share), profiles:user_id(first_name, last_name, msn_id)").order("purchase_date", {ascending:false}).limit(100),
      ]);

      const sales = salesRes.data||[];
      const objectives = objectivesRes.data||[];
      const companies = companiesRes.data||[];
      const allShares = sharesRes.data||[];

      const totalCommission = sales.reduce((s,sl)=>s+Number(sl.commission_earned),0);
      const totalSalesVolume = sales.reduce((s,sl)=>s+Number(sl.sale_price)*sl.quantity,0);
      const totalTitresSold = sales.reduce((s,sl)=>s+sl.quantity,0);

      // Monthly sales for chart
      const now = new Date();
      const monthlySales = Array.from({length:12},(_,i)=>{
        const d = new Date(now); d.setMonth(d.getMonth()-11+i);
        const key = d.toISOString().slice(0,7);
        const monthSales = sales.filter(s=>s.created_at.slice(0,7)===key);
        return {
          mois: d.toLocaleDateString("fr-FR",{month:"short"}),
          volume: monthSales.reduce((s,sl)=>s+Number(sl.sale_price)*sl.quantity,0),
          commissions: monthSales.reduce((s,sl)=>s+Number(sl.commission_earned),0),
          titres: monthSales.reduce((s,sl)=>s+sl.quantity,0),
        };
      });

      return { sales, objectives, companies, allShares, totalCommission, totalSalesVolume, totalTitresSold, monthlySales };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen" style={{background:"linear-gradient(135deg,#030711 0%,#050d1a 50%,#030711 100%)"}}>
      <Navbar/>

      {/* Header */}
      <div className="pt-20 pb-4 border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-mono text-xs text-amber-400/60 tracking-widest mb-1">ESPACE COURTIER</p>
              <h1 className="font-mono font-bold text-xl text-white">{profile?.first_name} {profile?.last_name}</h1>
              <p className="font-mono text-xs text-white/30 mt-0.5">{profile?.msn_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="font-mono text-xs text-emerald-400">COURTIER ACTIF</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 overflow-x-auto">
            {[
              {k:"overview",l:"APERÇU"},
              {k:"sales",l:"VENTES"},
              {k:"objectives",l:"OBJECTIFS"},
              {k:"clients",l:"ENTREPRISES"},
            ].map(({k,l})=>(
              <button key={k} onClick={()=>setActiveTab(k as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-mono tracking-widest transition-all ${activeTab===k?"bg-amber-500/20 text-amber-400 border border-amber-500/30":"text-white/30 hover:text-white/60 border border-transparent"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-5">

        {activeTab==="overview" && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {l:"COMMISSIONS TOTALES",v:fmtShort(data?.totalCommission||0)+" FCFA",Icon:Award,c:"amber"},
                {l:"VOLUME DE VENTES",v:fmtShort(data?.totalSalesVolume||0)+" FCFA",Icon:TrendingUp,c:"emerald"},
                {l:"TITRES PLACÉS",v:fmtShort(data?.totalTitresSold||0),Icon:Coins,c:"blue"},
                {l:"OBJECTIFS",v:`${(data?.objectives||[]).filter((o:any)=>o.is_completed).length}/${(data?.objectives||[]).length}`,Icon:Target,c:"purple"},
              ].map(({l,v,Icon,c})=>{
                const cls:{[k:string]:string}={amber:"border-amber-500/20 from-amber-500/10",emerald:"border-emerald-500/20 from-emerald-500/10",blue:"border-blue-500/20 from-blue-500/10",purple:"border-purple-500/20 from-purple-500/10"};
                const icls:{[k:string]:string}={amber:"text-amber-400",emerald:"text-emerald-400",blue:"text-blue-400",purple:"text-purple-400"};
                return (
                  <div key={l} className={`rounded-2xl border bg-gradient-to-br to-transparent p-5 ${cls[c]}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${icls[c]} bg-current/10`}>
                      <Icon className="h-4 w-4"/>
                    </div>
                    <p className="font-mono text-[10px] text-white/30 tracking-widest">{l}</p>
                    <p className="font-mono font-bold text-white text-xl mt-1">{isLoading?"...":v}</p>
                  </div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
                <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest mb-4">VOLUME DE VENTES — 12 MOIS</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.monthlySales||[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="mois" tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false}/>
                    <YAxis tickFormatter={v=>fmtShort(v)} tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false}/>
                    <Tooltip formatter={(v:any)=>fmtCurrency(v)} contentStyle={{background:"#0a0f1e",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:10,fontFamily:"monospace"}} labelStyle={{color:"rgba(255,255,255,0.4)"}}/>
                    <Bar dataKey="volume" fill="#f59e0b" fillOpacity={0.8} radius={[4,4,0,0]} name="Volume"/>
                    <Bar dataKey="commissions" fill="#10b981" fillOpacity={0.8} radius={[4,4,0,0]} name="Commissions"/>
                    <Legend wrapperStyle={{fontSize:10,fontFamily:"monospace",color:"rgba(255,255,255,0.4)"}}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
                <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest mb-4">TITRES PLACÉS — 12 MOIS</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data?.monthlySales||[]}>
                    <defs>
                      <linearGradient id="gTitres" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="mois" tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fontSize:9,fill:"rgba(255,255,255,0.2)",fontFamily:"monospace"}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid rgba(59,130,246,0.2)",borderRadius:8,fontSize:10,fontFamily:"monospace"}}/>
                    <Area type="monotone" dataKey="titres" stroke="#3b82f6" strokeWidth={2} fill="url(#gTitres)" name="Titres"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent sales */}
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-mono font-bold text-white/70 text-xs tracking-widest">DERNIÈRES VENTES</h3>
                <button onClick={()=>setActiveTab("sales")} className="font-mono text-[10px] text-amber-400/60 hover:text-amber-400">VOIR TOUT →</button>
              </div>
              <div className="divide-y divide-white/5">
                {(data?.sales||[]).slice(0,5).map((s:any)=>(
                  <div key={s.id} className="flex items-center justify-between p-4 hover:bg-white/2">
                    <div>
                      <p className="font-mono text-xs font-bold text-white/80">{(s.companies as any)?.name||"—"}</p>
                      <p className="font-mono text-[10px] text-white/30">{s.quantity} titre(s) · {new Date(s.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-amber-400">{fmtShort(s.commission_earned)} FCFA</p>
                      <p className="font-mono text-[10px] text-white/30">commission</p>
                    </div>
                  </div>
                ))}
                {(data?.sales||[]).length===0 && <div className="p-8 text-center font-mono text-xs text-white/20">AUCUNE VENTE ENREGISTRÉE</div>}
              </div>
            </div>
          </>
        )}

        {activeTab==="sales" && (
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:"rgba(255,255,255,0.02)"}}>
            <div className="p-4 border-b border-white/5">
              <h2 className="font-mono font-bold text-white/70 tracking-wider text-xs">REGISTRE DES VENTES ({(data?.sales||[]).length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {["ENTREPRISE","TITRES","PRIX VENTE","COMMISSION","DATE"].map(h=>(
                      <th key={h} className="text-[10px] font-mono text-white/20 tracking-widest text-left p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(data?.sales||[]).map((s:any)=>(
                    <tr key={s.id} className="hover:bg-white/2">
                      <td className="p-4 font-mono text-xs text-white/80 font-bold">{(s.companies as any)?.name||"—"}</td>
                      <td className="p-4 font-mono text-amber-400 font-bold">{s.quantity}</td>
                      <td className="p-4 font-mono text-xs text-white/60">{fmtShort(Number(s.sale_price)*s.quantity)} FCFA</td>
                      <td className="p-4 font-mono text-emerald-400 font-bold">{fmtShort(s.commission_earned)} FCFA</td>
                      <td className="p-4 font-mono text-[10px] text-white/30">{new Date(s.created_at).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data?.sales||[]).length===0 && <div className="p-8 text-center font-mono text-xs text-white/20">AUCUNE VENTE</div>}
            </div>
          </div>
        )}

        {activeTab==="objectives" && (
          <div className="space-y-4">
            {(data?.objectives||[]).length===0 ? (
              <div className="text-center py-16 rounded-2xl border border-white/5" style={{background:"rgba(255,255,255,0.02)"}}>
                <Target className="h-12 w-12 text-white/10 mx-auto mb-3"/>
                <p className="font-mono text-white/30 text-xs">AUCUN OBJECTIF ASSIGNÉ</p>
                <p className="font-mono text-white/15 text-[10px] mt-1">Vos objectifs seront définis par l'administrateur</p>
              </div>
            ) : (data?.objectives||[]).map((obj:any)=>{
              const pct = obj.target_quantity>0?Math.min(100,(data?.totalTitresSold||0)/obj.target_quantity*100):0;
              return (
                <div key={obj.id} className="rounded-2xl border border-white/5 p-5" style={{background:"rgba(255,255,255,0.02)"}}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-white/90">{obj.description||"Objectif de vente"}</p>
                      <p className="font-mono text-[10px] text-white/30">{(obj.companies as any)?.name||"Toutes entreprises"} · {obj.deadline?new Date(obj.deadline).toLocaleDateString("fr-FR"):"Sans échéance"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono border ${obj.is_completed?"bg-emerald-500/10 border-emerald-500/20 text-emerald-400":"bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                      {obj.is_completed?"ATTEINT":"EN COURS"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div><p className="font-mono text-[10px] text-white/30">QUANTITÉ CIBLE</p><p className="font-mono font-bold text-white">{obj.target_quantity} titres</p></div>
                    <div><p className="font-mono text-[10px] text-white/30">MONTANT CIBLE</p><p className="font-mono font-bold text-white">{fmtShort(obj.target_amount)} FCFA</p></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-white/30 mb-1">
                      <span>PROGRESSION</span><span className="text-amber-400">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:"linear-gradient(90deg,#f59e0b,#fbbf24)"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="clients" && (
          <div className="space-y-3">
            {(data?.companies||[]).map((c:any)=>{
              const commission = (c.broker_commissions as any)?.commission_rate||0;
              const fixed = (c.broker_commissions as any)?.fixed_commission||0;
              return (
                <div key={c.id} className="rounded-2xl border border-white/5 p-5 hover:border-amber-500/15 transition-all" style={{background:"rgba(255,255,255,0.02)"}}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {c.logo_url?<img src={c.logo_url} alt="" className="w-full h-full object-cover"/>:<Building2 className="h-4 w-4 text-amber-400/50"/>}
                      </div>
                      <div>
                        <p className="font-mono font-bold text-white/90">{c.name}</p>
                        <p className="font-mono text-[10px] text-white/30">{c.sector} · {c.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 flex-wrap text-right">
                      <div>
                        <p className="font-mono text-[10px] text-white/30">PRIX/TITRE</p>
                        <p className="font-mono font-bold text-amber-400">{Number(c.price_per_share).toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] text-white/30">DISPONIBLES</p>
                        <p className="font-mono font-bold text-white">{c.available_shares.toLocaleString()}</p>
                      </div>
                      {(commission>0||fixed>0) && (
                        <div>
                          <p className="font-mono text-[10px] text-white/30">MA COMMISSION</p>
                          <p className="font-mono font-bold text-emerald-400">{commission>0?commission+"%":"—"}{fixed>0?` + ${fixed} FCFA`:""}</p>
                        </div>
                      )}
                      <Link to={`/entreprises/${c.id}`} className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono hover:bg-amber-500/20 transition-all">
                        DÉTAILS →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtierDashboard;
