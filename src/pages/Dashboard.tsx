import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { mockUserShares, mockTransactions } from "@/data/mockData";
import { Wallet, Briefcase, TrendingUp, BarChart3, Clock, ArrowUpRight, ArrowDownLeft, ShoppingCart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const totalInvested = mockUserShares.reduce((sum, s) => sum + s.purchasePrice * s.quantity, 0);
  const currentValue = mockUserShares.reduce((sum, s) => sum + s.currentPrice * s.quantity, 0);
  const profit = currentValue - totalInvested;
  const profitPercent = ((profit / totalInvested) * 100).toFixed(2);
  const walletBalance = 810000;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">Bienvenue, Investisseur • <span className="text-primary font-mono text-sm">MSN-HC-123456</span></p>
          </div>
          <Button variant="gold" size="sm">
            <Wallet className="mr-2 h-4 w-4" />
            Recharger
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Portefeuille"
            value={`${walletBalance.toLocaleString()} FCFA`}
            icon={<Wallet className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Valeur des actions"
            value={`${currentValue.toLocaleString()} FCFA`}
            change={`${Number(profitPercent) > 0 ? '+' : ''}${profitPercent}%`}
            isPositive={profit >= 0}
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Total investi"
            value={`${totalInvested.toLocaleString()} FCFA`}
            icon={<Briefcase className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Bénéfice"
            value={`${profit.toLocaleString()} FCFA`}
            change={`${Number(profitPercent) > 0 ? '+' : ''}${profitPercent}%`}
            isPositive={profit >= 0}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Shares */}
          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Mes Actions
            </h2>
            <div className="space-y-4">
              {mockUserShares.map((share) => {
                const shareProfit = (share.currentPrice - share.purchasePrice) * share.quantity;
                const shareProfitPercent = ((share.currentPrice - share.purchasePrice) / share.purchasePrice * 100).toFixed(1);
                const isUp = shareProfit >= 0;
                return (
                  <div key={share.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="font-semibold text-foreground">{share.companyName}</p>
                      <p className="text-xs text-muted-foreground">{share.quantity} actions • Acheté le {share.purchaseDate}</p>
                      <p className="text-xs text-muted-foreground font-mono">{share.orderNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold text-foreground">{(share.currentPrice * share.quantity).toLocaleString()} FCFA</p>
                      <p className={`text-sm font-medium ${isUp ? "text-success" : "text-destructive"}`}>
                        {isUp ? "+" : ""}{shareProfit.toLocaleString()} ({isUp ? "+" : ""}{shareProfitPercent}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Transactions récentes
            </h2>
            <div className="space-y-3">
              {mockTransactions.map((tx) => {
                const icon = tx.type === "deposit" ? <ArrowDownLeft className="h-4 w-4 text-success" /> :
                  tx.type === "withdrawal" ? <ArrowUpRight className="h-4 w-4 text-destructive" /> :
                    tx.type === "purchase" ? <ShoppingCart className="h-4 w-4 text-primary" /> :
                      <Send className="h-4 w-4 text-info" />;
                const statusColor = tx.status === "approved" ? "text-success" : tx.status === "pending" ? "text-warning" : "text-destructive";
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">{icon}</div>
                      <div>
                        <p className="text-sm text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === "deposit" ? "text-success" : "text-foreground"}`}>
                        {tx.type === "deposit" ? "+" : "-"}{tx.amount.toLocaleString()} FCFA
                      </p>
                      <p className={`text-xs ${statusColor} capitalize`}>{tx.status === "approved" ? "Validé" : tx.status === "pending" ? "En attente" : "Rejeté"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 glass-card p-6">
          <h2 className="font-heading font-semibold text-xl text-foreground mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Wallet className="h-6 w-6" />, label: "Recharger", desc: "Ajouter des fonds" },
              { icon: <ShoppingCart className="h-6 w-6" />, label: "Acheter", desc: "Acheter des actions" },
              { icon: <Send className="h-6 w-6" />, label: "Transférer", desc: "Envoyer de l'argent" },
              { icon: <ArrowUpRight className="h-6 w-6" />, label: "Retirer", desc: "Retirer des fonds" },
            ].map((action, i) => (
              <button key={i} className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/50 hover:border-primary/30 transition-all text-center group">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  {action.icon}
                </div>
                <p className="font-semibold text-foreground text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
