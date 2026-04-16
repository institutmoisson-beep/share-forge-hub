import { useQuery } from "@tanstack/react-query";
import {
  Users, Building2, Coins, Wallet, BarChart3, FileText,
  MessageSquare, Calculator, Settings, Shield, Activity,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const fmtShort = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);

const ROLE_CONFIG: Record<string, {
  label: string;
  color: string;
  accent: string;
  description: string;
  icon: any;
  quickLinks: { label: string; href: string; Icon: any }[];
}> = {
  gestionnaire_utilisateurs: {
    label: "GESTIONNAIRE MEMBRES",
    color: "cyan",
    accent: "bg-cyan-500/20 border-cyan-500/30 text-cyan-400",
    description: "Supervise les comptes membres, les accès et les données utilisateurs.",
    icon: Users,
    quickLinks: [
      { label: "TABLEAU DE BORD", href: "/dashboard", Icon: BarChart3 },
      { label: "MARCHÉ", href: "/marketplace", Icon: Coins },
      { label: "ENTREPRISES", href: "/entreprises", Icon: Building2 },
    ],
  },
  gestionnaire_achats: {
    label: "GESTIONNAIRE ACHATS",
    color: "purple",
    accent: "bg-purple-500/20 border-purple-500/30 text-purple-400",
    description: "Supervise les ordres d'achat, validations et flux de participation.",
    icon: Coins,
    quickLinks: [
      { label: "ENTREPRISES", href: "/entreprises", Icon: Building2 },
      { label: "MARCHÉ P2P", href: "/marketplace", Icon: Activity },
    ],
  },
  communication: {
    label: "COMMUNICATION",
    color: "pink",
    accent: "bg-pink-500/20 border-pink-500/30 text-pink-400",
    description: "Gère la communication et la visibilité de la plateforme.",
    icon: MessageSquare,
    quickLinks: [
      { label: "ENTREPRISES", href: "/entreprises", Icon: Building2 },
      { label: "MARCHÉ", href: "/marketplace", Icon: Activity },
    ],
  },
  comptable: {
    label: "COMPTABLE",
    color: "indigo",
    accent: "bg-indigo-500/20 border-indigo-500/30 text-indigo-400",
    description: "Accès aux rapports financiers et à la comptabilité de la plateforme.",
    icon: Calculator,
    quickLinks: [
      { label: "ENTREPRISES", href: "/entreprises", Icon: Building2 },
    ],
  },
  moderateur: {
    label: "MODÉRATEUR",
    color: "orange",
    accent: "bg-orange-500/20 border-orange-500/30 text-orange-400",
    description: "Supervise les annonces du marché secondaire et les activités membres.",
    icon: Shield,
    quickLinks: [
      { label: "MARCHÉ P2P", href: "/marketplace", Icon: Activity },
      { label: "ENTREPRISES", href: "/entreprises", Icon: Building2 },
    ],
  },
  consultant: {
    label: "CONSULTANT",
    color: "teal",
    accent: "bg-teal-500/20 border-teal-500/30 text-teal-400",
    description: "Accès analytique aux données de la plateforme pour reporting.",
    icon: BarChart3,
    quickLinks: [
      { label: "ENTREPRISES", href: "/entreprises", Icon: Building2 },
      { label: "MARCHÉ", href: "/marketplace", Icon: Coins },
    ],
  },
  informaticien: {
    label: "INFORMATICIEN",
    color: "violet",
    accent: "bg-violet-500/20 border-violet-500/30 text-violet-400",
    description: "Support technique et maintenance des systèmes de la plateforme.",
    icon: Settings,
    quickLinks: [
      { label: "ENTREPRISES", href: "/entreprises", Icon: Building2 },
    ],
  },
};

interface GenericRoleDashboardProps {
  role: string;
}

const GenericRoleDashboard = ({ role }: GenericRoleDashboardProps) => {
  const { user, profile } = useAuth();
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG["consultant"];
  const Icon = cfg.icon;

  const { data } = useQuery({
    queryKey: ["generic-dashboard-stats", user?.id],
    queryFn: async () => {
      const [companiesRes, sharesRes, walletsRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("user_shares").select("id", { count: "exact", head: true }),
        supabase.from("wallets").select("balance"),
      ]);
      const totalBalance = (walletsRes.data || []).reduce((s, w) => s + Number(w.balance || 0), 0);
      return {
        companies: companiesRes.count || 0,
        shares: sharesRes.count || 0,
        totalBalance,
      };
    },
    enabled: !!user,
  });

  const colorMap: Record<string, string> = {
    cyan: "border-cyan-500/20 from-cyan-500/10",
    purple: "border-purple-500/20 from-purple-500/10",
    pink: "border-pink-500/20 from-pink-500/10",
    indigo: "border-indigo-500/20 from-indigo-500/10",
    orange: "border-orange-500/20 from-orange-500/10",
    teal: "border-teal-500/20 from-teal-500/10",
    violet: "border-violet-500/20 from-violet-500/10",
  };
  const iconColorMap: Record<string, string> = {
    cyan: "text-cyan-400", purple: "text-purple-400", pink: "text-pink-400",
    indigo: "text-indigo-400", orange: "text-orange-400", teal: "text-teal-400", violet: "text-violet-400",
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#030711 0%,#050d1a 50%,#030711 100%)" }}>
      <Navbar />

      <div className="pt-20 pb-4 border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${cfg.accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={`font-mono text-xs tracking-widest ${iconColorMap[cfg.color]}/60`}>{cfg.label}</p>
              <h1 className="font-mono font-bold text-xl text-white">{profile?.first_name} {profile?.last_name}</h1>
              <p className="font-mono text-xs text-white/30">{profile?.msn_id}</p>
            </div>
          </div>
          <p className="font-mono text-xs text-white/30 mt-3 max-w-lg">{cfg.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { l: "ENTREPRISES ACTIVES", v: data?.companies || 0, Icon: Building2 },
            { l: "PARTICIPATIONS", v: data?.shares || 0, Icon: Coins },
            { l: "TOTAL PORTEFEUILLES", v: fmtShort(data?.totalBalance || 0) + " FCFA", Icon: Wallet },
          ].map(({ l, v, Icon: I }) => (
            <div key={l} className={`rounded-2xl border bg-gradient-to-br to-transparent p-5 ${colorMap[cfg.color]}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconColorMap[cfg.color]}`}>
                <I className="h-4 w-4" />
              </div>
              <p className="font-mono text-[10px] text-white/30 tracking-widest">{l}</p>
              <p className="font-mono font-bold text-white text-2xl mt-1">{v}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <p className="font-mono text-[10px] text-white/20 tracking-widest mb-3">ACCÈS RAPIDES</p>
          <div className="flex flex-wrap gap-3">
            {cfg.quickLinks.map(({ label, href, Icon: I }) => (
              <Link key={href} to={href}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-xs font-mono tracking-wider transition-all ${cfg.accent} hover:opacity-80`}>
                <I className="h-4 w-4" />{label}
              </Link>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-white/5 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColorMap[cfg.color]} opacity-50`}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-white/70 text-sm mb-2">ESPACE {cfg.label}</h3>
              <p className="font-mono text-xs text-white/30 leading-relaxed">
                Vous êtes connecté en tant que <span className={`font-bold ${iconColorMap[cfg.color]}`}>{cfg.label}</span> sur la plateforme MSN Hors Cote.
                Votre rôle vous donne accès aux sections correspondantes à votre domaine de responsabilité.
                Pour des fonctionnalités supplémentaires, veuillez contacter l'administrateur.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs text-emerald-400/70">SYSTÈME OPÉRATIONNEL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericRoleDashboard;
