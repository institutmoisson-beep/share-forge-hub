import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { Wallet, Briefcase, TrendingUp, BarChart3, Clock, ArrowUpRight, ArrowDownLeft, ShoppingCart, Send, LogIn, Shield, UserCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { invokePlatformAction } from "@/lib/platform-actions";

const formatCurrency = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const Dashboard = () => {
  const { user, profile, loading: authLoading, hasRole, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<null | "deposit" | "transfer" | "withdraw" | "profile" | "sell">(null);
  const [profileForm, setProfileForm] = useState({ first_name: profile?.first_name || "", last_name: profile?.last_name || "", phone: profile?.phone || "" });
  const [depositForm, setDepositForm] = useState({ amount: "", payment_service_id: "", payment_contact: "", payment_transaction_id: "", payment_date: "", description: "" });
  const [transferForm, setTransferForm] = useState({ recipient_msn_id: "", amount: "", description: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", payment_contact: "", description: "" });
  const [sellForm, setSellForm] = useState({ user_share_id: "", quantity: "", price_per_share: "" });
  const isAdmin = hasRole("admin") || user?.email === "picelvus@gmail.com";

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user && !authLoading,
  });

  const { data: shares = [] } = useQuery({
    queryKey: ["user_shares", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_shares").select("*, companies(name, price_per_share, sector)").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user && !authLoading,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user && !authLoading,
  });

  const { data: paymentServices = [] } = useQuery({
    queryKey: ["payment-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_services").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !authLoading,
  });

  const { data: activeListings = [] } = useQuery({
    queryKey: ["my-active-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("p2p_listings").select("*").eq("seller_id", user!.id).eq("status", "active").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !authLoading,
  });

  const refreshUserData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["user_shares"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["my-active-listings"] }),
      queryClient.invalidateQueries({ queryKey: ["p2p-listings"] }),
      queryClient.invalidateQueries({ queryKey: ["companies"] }),
      queryClient.invalidateQueries({ queryKey: ["featured-companies"] }),
    ]);
  };

  useEffect(() => {
    setProfileForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
    });
  }, [profile?.first_name, profile?.last_name, profile?.phone]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(profileForm).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Profil mis à jour.");
      setActiveDialog(null);
      await refreshProfile();
      await refreshUserData();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      if (!wallet?.id) throw new Error("Portefeuille introuvable.");
      const amount = Number(depositForm.amount);
      if (!depositForm.payment_service_id || amount <= 0 || !depositForm.payment_contact || !depositForm.payment_transaction_id || !depositForm.payment_date) {
        throw new Error("Veuillez remplir toutes les informations de recharge.");
      }

      const { error } = await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: user!.id,
        amount,
        type: "deposit",
        status: "pending",
        payment_service_id: depositForm.payment_service_id,
        payment_contact: depositForm.payment_contact,
        payment_transaction_id: depositForm.payment_transaction_id,
        payment_date: depositForm.payment_date,
        description: depositForm.description || "Demande de recharge",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Votre demande de recharge a été envoyée.");
      setActiveDialog(null);
      setDepositForm({ amount: "", payment_service_id: "", payment_contact: "", payment_transaction_id: "", payment_date: "", description: "" });
      await refreshUserData();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!wallet?.id) throw new Error("Portefeuille introuvable.");
      const amount = Number(withdrawForm.amount);
      if (amount <= 0 || !withdrawForm.payment_contact) {
        throw new Error("Veuillez renseigner le montant et le contact de retrait.");
      }

      const { error } = await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: user!.id,
        amount,
        type: "withdrawal",
        status: "pending",
        payment_contact: withdrawForm.payment_contact,
        description: withdrawForm.description || "Demande de retrait",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Votre demande de retrait a été envoyée.");
      setActiveDialog(null);
      setWithdrawForm({ amount: "", payment_contact: "", description: "" });
      await refreshUserData();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const transferMutation = useMutation({
    mutationFn: async () => invokePlatformAction("transfer_money", {
      recipientMsnId: transferForm.recipient_msn_id,
      amount: Number(transferForm.amount),
      description: transferForm.description,
    }),
    onSuccess: async () => {
      toast.success("Transfert effectué avec succès.");
      setActiveDialog(null);
      setTransferForm({ recipient_msn_id: "", amount: "", description: "" });
      await refreshUserData();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sellMutation = useMutation({
    mutationFn: async () => invokePlatformAction("create_listing", {
      userShareId: sellForm.user_share_id,
      quantity: Number(sellForm.quantity),
      pricePerShare: Number(sellForm.price_per_share),
    }),
    onSuccess: async () => {
      toast.success("Votre annonce est publiée sur le marché secondaire.");
      setActiveDialog(null);
      setSellForm({ user_share_id: "", quantity: "", price_per_share: "" });
      await refreshUserData();
    },
    onError: (error: Error) => toast.error(error.message),
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

  const openSellDialog = (share?: (typeof shares)[number]) => {
    if (shares.length === 0) {
      toast.error("Vous ne détenez encore aucun titre à vendre.");
      return;
    }

    if (share) {
      setSellForm({
        user_share_id: share.id,
        quantity: String(share.quantity),
        price_per_share: String(Number(share.companies?.price_per_share || share.purchase_price)),
      });
    }

    setActiveDialog("sell");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">
              Bienvenue, {profile?.first_name || "Membre"} • <span className="text-primary font-mono text-sm">{profile?.msn_id}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <Shield className="mr-2 h-4 w-4" />
                  Administration
                </Button>
              </Link>
            )}
            <Button variant="gold" size="sm" onClick={() => setActiveDialog("deposit")}>
              <Wallet className="mr-2 h-4 w-4" />
              Recharger
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Portefeuille" value={`${walletBalance.toLocaleString()} FCFA`}
            icon={<Wallet className="h-5 w-5 text-primary" />} />
          <StatCard title="Valeur des actions" value={`${currentValue.toLocaleString()} FCFA`}
            change={`${Number(profitPercent) > 0 ? '+' : ''}${profitPercent}%`} isPositive={profit >= 0}
            icon={<BarChart3 className="h-5 w-5 text-primary" />} />
          <StatCard title="Total engagé" value={`${totalInvested.toLocaleString()} FCFA`}
            icon={<Briefcase className="h-5 w-5 text-primary" />} />
          <StatCard title="Bénéfice" value={`${profit.toLocaleString()} FCFA`}
            change={`${Number(profitPercent) > 0 ? '+' : ''}${profitPercent}%`} isPositive={profit >= 0}
            icon={<TrendingUp className="h-5 w-5 text-primary" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
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
                       <div className="text-right space-y-2">
                        <p className="font-heading font-bold text-foreground">{(currentPrice * share.quantity).toLocaleString()} FCFA</p>
                        <p className={`text-sm font-medium ${isUp ? "text-success" : "text-destructive"}`}>
                          {isUp ? "+" : ""}{shareProfit.toLocaleString()} ({isUp ? "+" : ""}{shareProfitPercent}%)
                        </p>
                          <Button variant="outline" size="sm" onClick={() => openSellDialog(share)}>
                            <Store className="mr-2 h-4 w-4" />
                            Vendre
                          </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="glass-card p-6">
              <h2 className="font-heading font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                Mon profil
              </h2>

              <div className="space-y-3">
                <div className="rounded-xl bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-medium text-foreground">{profile?.first_name || "—"} {profile?.last_name || ""}</p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium text-foreground">{profile?.phone || "Non renseigné"}</p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Annonces actives</p>
                  <p className="font-medium text-foreground">{activeListings.length}</p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4" onClick={() => {
                setProfileForm({
                  first_name: profile?.first_name || "",
                  last_name: profile?.last_name || "",
                  phone: profile?.phone || "",
                });
                setActiveDialog("profile");
              }}>
                Modifier mon profil
              </Button>
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
                    const isPositive = tx.type === "deposit";
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
                          <p className={`text-sm font-semibold ${isPositive ? "text-success" : "text-foreground"}`}>
                            {isPositive ? "+" : "-"}{Number(tx.amount).toLocaleString()} FCFA
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
        </div>

        <div className="mt-8 glass-card p-6">
          <h2 className="font-heading font-semibold text-xl text-foreground mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: <Wallet className="h-6 w-6" />, label: "Recharger", desc: "Ajouter des fonds", action: () => setActiveDialog("deposit") },
              { icon: <ShoppingCart className="h-6 w-6" />, label: "Acheter", desc: "Acheter des actions", link: "/entreprises" },
              { icon: <Store className="h-6 w-6" />, label: "Vendre", desc: "Publier une annonce", action: () => openSellDialog() },
              { icon: <Send className="h-6 w-6" />, label: "Transférer", desc: "Envoyer de l'argent", action: () => setActiveDialog("transfer") },
              { icon: <ArrowUpRight className="h-6 w-6" />, label: "Retirer", desc: "Retirer des fonds", action: () => setActiveDialog("withdraw") },
            ].map((action, i) => (
              action.link ? (
                <Link key={i} to={action.link}>
                  <button className="w-full p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/50 hover:border-primary/30 transition-all text-center group">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                      {action.icon}
                    </div>
                    <p className="font-semibold text-foreground text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </button>
                </Link>
              ) : (
                <button key={i} className="w-full p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/50 hover:border-primary/30 transition-all text-center group" onClick={action.action}>
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    {action.icon}
                  </div>
                  <p className="font-semibold text-foreground text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </button>
              )
            ))}
          </div>
        </div>

        <Dialog open={activeDialog === "profile"} onOpenChange={(open) => setActiveDialog(open ? "profile" : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier mon profil</DialogTitle>
              <DialogDescription>Mettez à jour vos informations visibles dans l'application.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Prénom" value={profileForm.first_name} onChange={(event) => setProfileForm((prev) => ({ ...prev, first_name: event.target.value }))} />
              <Input placeholder="Nom" value={profileForm.last_name} onChange={(event) => setProfileForm((prev) => ({ ...prev, last_name: event.target.value }))} />
              <Input placeholder="Téléphone" value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
              <Button variant="gold" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activeDialog === "deposit"} onOpenChange={(open) => setActiveDialog(open ? "deposit" : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demande de recharge</DialogTitle>
              <DialogDescription>Choisissez le service de paiement utilisé puis joignez les détails de votre transaction.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={depositForm.payment_service_id} onValueChange={(value) => setDepositForm((prev) => ({ ...prev, payment_service_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Service de paiement" />
                </SelectTrigger>
                <SelectContent>
                  {paymentServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {depositForm.payment_service_id && (
                <div className="rounded-xl bg-secondary/30 p-3 text-sm text-muted-foreground">
                  {paymentServices.find((service) => service.id === depositForm.payment_service_id)?.instructions || "Suivez les instructions du service choisi puis envoyez la référence de transaction."}
                </div>
              )}
              <Input type="number" placeholder="Montant" value={depositForm.amount} onChange={(event) => setDepositForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input placeholder="Contact utilisé" value={depositForm.payment_contact} onChange={(event) => setDepositForm((prev) => ({ ...prev, payment_contact: event.target.value }))} />
              <Input placeholder="ID / Référence de transaction" value={depositForm.payment_transaction_id} onChange={(event) => setDepositForm((prev) => ({ ...prev, payment_transaction_id: event.target.value }))} />
              <Input type="datetime-local" value={depositForm.payment_date} onChange={(event) => setDepositForm((prev) => ({ ...prev, payment_date: event.target.value }))} />
              <Textarea placeholder="Note complémentaire" value={depositForm.description} onChange={(event) => setDepositForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
              <Button variant="gold" onClick={() => depositMutation.mutate()} disabled={depositMutation.isPending}>
                {depositMutation.isPending ? "Envoi..." : "Envoyer la demande"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activeDialog === "transfer"} onOpenChange={(open) => setActiveDialog(open ? "transfer" : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transférer de l'argent</DialogTitle>
              <DialogDescription>Envoyez des fonds à un autre utilisateur via son identifiant MSN-HC.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Identifiant du destinataire (MSN-HC-XXXXXX)" value={transferForm.recipient_msn_id} onChange={(event) => setTransferForm((prev) => ({ ...prev, recipient_msn_id: event.target.value }))} />
              <Input type="number" placeholder="Montant" value={transferForm.amount} onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Textarea placeholder="Description" value={transferForm.description} onChange={(event) => setTransferForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
              <Button variant="gold" onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending}>
                {transferMutation.isPending ? "Traitement..." : "Envoyer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activeDialog === "withdraw"} onOpenChange={(open) => setActiveDialog(open ? "withdraw" : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demande de retrait</DialogTitle>
              <DialogDescription>Indiquez le montant à retirer et le moyen de réception souhaité.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input type="number" placeholder="Montant" value={withdrawForm.amount} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input placeholder="Contact, email ou adresse crypto" value={withdrawForm.payment_contact} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, payment_contact: event.target.value }))} />
              <Textarea placeholder="Instructions ou note" value={withdrawForm.description} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
              <Button variant="gold" onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? "Envoi..." : "Envoyer la demande"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activeDialog === "sell"} onOpenChange={(open) => setActiveDialog(open ? "sell" : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vendre mes actions</DialogTitle>
              <DialogDescription>Publiez une annonce sur le marché secondaire à partir des titres déjà détenus.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={sellForm.user_share_id} onValueChange={(value) => {
                const selectedShare = shares.find((share) => share.id === value);
                setSellForm({
                  user_share_id: value,
                  quantity: selectedShare ? String(selectedShare.quantity) : "",
                  price_per_share: selectedShare ? String(Number(selectedShare.companies?.price_per_share || selectedShare.purchase_price)) : "",
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une ligne de titres" />
                </SelectTrigger>
                <SelectContent>
                  {shares.map((share) => (
                    <SelectItem key={share.id} value={share.id}>
                      {(share.companies?.name || "Entreprise")} • {share.quantity} titre(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Quantité à vendre" value={sellForm.quantity} onChange={(event) => setSellForm((prev) => ({ ...prev, quantity: event.target.value }))} />
              <Input type="number" placeholder="Prix par titre" value={sellForm.price_per_share} onChange={(event) => setSellForm((prev) => ({ ...prev, price_per_share: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
              <Button variant="gold" onClick={() => sellMutation.mutate()} disabled={sellMutation.isPending || shares.length === 0}>
                {sellMutation.isPending ? "Publication..." : "Publier l'annonce"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
