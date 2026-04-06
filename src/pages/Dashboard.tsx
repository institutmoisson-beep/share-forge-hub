import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { Wallet, Briefcase, TrendingUp, BarChart3, Clock, ArrowUpRight, ArrowDownLeft, ShoppingCart, Send, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: shares = [] } = useQuery({
    queryKey: ["user_shares", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_shares").select("*, companies(name, price_per_share, sector)").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4 text-center">
          <div className="glass-card p-12 max-w-md mx-auto">
            <LogIn className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Connexion requise</h2>
            <p className="text-muted-foreground mb-6">Connectez-vous pour accéder à votre tableau de bord.</p>
            <Link to="/login"><Button variant="gold" size="lg">Se connecter</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const totalInvested = shares.reduce((sum, s) => sum + Number(s.purchase_price) * s.quantity, 0);
  const currentValue = shares.reduce((sum, s) => sum + Number(s.companies?.price_per_share || s.purchase_price) * s.quantity, 0);
  const profit = currentValue - totalInvested;
  const profitPercent = totalInvested > 0 ? ((profit / totalInvested) * 100).toFixed(2) : "0";
  const walletBalance = Number(wallet?.balance || 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">
              Bienvenue, {profile?.first_name || "Investisseur"} • <span className="text-primary font-mono text-sm">{profile?.msn_id}</span>
            </p>
          </div>
          <Button variant="gold" size="sm">
            <Wallet className="mr-2 h-4 w-4" />
            Recharger
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Portefeuille" value={`${walletBalance.toLocaleString()} FCFA`}
            icon={<Wallet className="h-5 w-5 text-primary" />} />
          <StatCard title="Valeur des actions" value={`${currentValue.toLocaleString()} FCFA`}
            change={`${Number(profitPercent) > 0 ? '+' : ''}${profitPercent}%`} isPositive={profit >= 0}
            icon={<BarChart3 className="h-5 w-5 text-primary" />} />
          <StatCard title="Total investi" value={`${totalInvested.toLocaleString()} FCFA`}
            icon={<Briefcase className="h-5 w-5 text-primary" />} />
          <StatCard title="Bénéfice" value={`${profit.toLocaleString()} FCFA`}
            change={`${Number(profitPercent) > 0 ? '+' : ''}${profitPercent}%`} isPositive={profit >= 0}
            icon={<TrendingUp className="h-5 w-5 text-primary" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Mes Actions ({shares.length})
            </h2>
            {shares.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune action pour le moment.</p>
                <Link to="/entreprises"><Button variant="gold-outline" size="sm" className="mt-3">Explorer les entreprises</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                {shares.map((share) => {
                  const currentPrice = Number(share.companies?.price_per_share || share.purchase_price);
                  const shareProfit = (currentPrice - Number(share.purchase_price)) * share.quantity;
                  const shareProfitPercent = ((currentPrice - Number(share.purchase_price)) / Number(share.purchase_price) * 100).toFixed(1);
                  const isUp = shareProfit >= 0;
                  return (
                    <div key={share.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div>
                        <p className="font-semibold text-foreground">{share.companies?.name || "Entreprise"}</p>
                        <p className="text-xs text-muted-foreground">{share.quantity} actions • {new Date(share.purchase_date).toLocaleDateString("fr")}</p>
                        <p className="text-xs text-muted-foreground font-mono">{share.order_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-bold text-foreground">{(currentPrice * share.quantity).toLocaleString()} FCFA</p>
                        <p className={`text-sm font-medium ${isUp ? "text-success" : "text-destructive"}`}>
                          {isUp ? "+" : ""}{shareProfit.toLocaleString()} ({isUp ? "+" : ""}{shareProfitPercent}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Transactions récentes
            </h2>
            {transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucune transaction.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const icon = tx.type === "deposit" ? <ArrowDownLeft className="h-4 w-4 text-success" /> :
                    tx.type === "withdrawal" ? <ArrowUpRight className="h-4 w-4 text-destructive" /> :
                      tx.type === "purchase" ? <ShoppingCart className="h-4 w-4 text-primary" /> :
                        <Send className="h-4 w-4 text-info" />;
                  const statusColor = tx.status === "approved" ? "text-success" : tx.status === "pending" ? "text-warning" : "text-destructive";
                  const statusLabel = tx.status === "approved" ? "Validé" : tx.status === "pending" ? "En attente" : "Rejeté";
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">{icon}</div>
                        <div>
                          <p className="text-sm text-foreground">{tx.description || tx.type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("fr")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.type === "deposit" ? "text-success" : "text-foreground"}`}>
                          {tx.type === "deposit" ? "+" : "-"}{Number(tx.amount).toLocaleString()} FCFA
                        </p>
                        <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 glass-card p-6">
          <h2 className="font-heading font-semibold text-xl text-foreground mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Wallet className="h-6 w-6" />, label: "Recharger", desc: "Ajouter des fonds" },
              { icon: <ShoppingCart className="h-6 w-6" />, label: "Acheter", desc: "Acheter des actions", link: "/entreprises" },
              { icon: <Send className="h-6 w-6" />, label: "Transférer", desc: "Envoyer de l'argent" },
              { icon: <ArrowUpRight className="h-6 w-6" />, label: "Retirer", desc: "Retirer des fonds" },
            ].map((action, i) => (
              <Link key={i} to={action.link || "#"}>
                <button className="w-full p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/50 hover:border-primary/30 transition-all text-center group">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    {action.icon}
                  </div>
                  <p className="font-semibold text-foreground text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
