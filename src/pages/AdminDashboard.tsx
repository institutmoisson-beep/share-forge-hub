import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  Coins,
  CreditCard,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVITY_SECTORS } from "@/data/sectors";
import { supabase } from "@/integrations/supabase/client";
import { invokePlatformAction } from "@/lib/platform-actions";

const APP_ROLES = [
  "admin",
  "courtier",
  "financier",
  "gestionnaire_entreprises",
  "gestionnaire_achats",
  "gestionnaire_utilisateurs",
  "communication",
  "comptable",
  "moderateur",
  "consultant",
  "informaticien",
] as const;

const emptyCompanyForm = {
  name: "",
  registre_commerce: "",
  country: "",
  city: "",
  location: "",
  sector: ACTIVITY_SECTORS[0],
  description: "",
  total_shares: 0,
  available_shares: 0,
  price_per_share: 0,
  previous_price: 0,
  logo_url: "",
  video_url: "",
  is_active: true,
};

const emptyServiceForm = {
  name: "",
  contact: "",
  payment_link: "",
  instructions: "",
  is_active: true,
};

const formatCurrency = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const AdminDashboard = () => {
  const { user, loading: authLoading, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const isAdmin = hasRole("admin") || user?.email === "picelvus@gmail.com";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-data", user?.id],
    enabled: !authLoading && !!user && isAdmin,
    queryFn: async () => {
      const [companiesRes, profilesRes, rolesRes, walletsRes, transactionsRes, servicesRes, sharesRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("wallets").select("*"),
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("payment_services").select("*").order("created_at", { ascending: false }),
        supabase.from("user_shares").select("*, companies(name)").order("purchase_date", { ascending: false }).limit(100),
      ]);

      const errors = [
        companiesRes.error,
        profilesRes.error,
        rolesRes.error,
        walletsRes.error,
        transactionsRes.error,
        servicesRes.error,
        sharesRes.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw errors[0];
      }

      const profiles = profilesRes.data || [];
      const roleRecords = rolesRes.data || [];
      const wallets = walletsRes.data || [];
      const transactions = transactionsRes.data || [];
      const shares = sharesRes.data || [];

      const rolesByUserId = roleRecords.reduce<Record<string, string[]>>((acc, role) => {
        acc[role.user_id] = [...(acc[role.user_id] || []), role.role];
        return acc;
      }, {});

      const walletsByUserId = wallets.reduce<Record<string, number>>((acc, wallet) => {
        acc[wallet.user_id] = Number(wallet.balance || 0);
        return acc;
      }, {});

      const profilesByUserId = profiles.reduce<Record<string, (typeof profiles)[number]>>((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {});

      const users = profiles.map((profile) => ({
        ...profile,
        roles: rolesByUserId[profile.user_id] || [],
        walletBalance: walletsByUserId[profile.user_id] || 0,
      }));

      const enrichedShares = shares.map((share) => ({
        ...share,
        owner: profilesByUserId[share.user_id],
      }));

      return {
        companies: companiesRes.data || [],
        paymentServices: servicesRes.data || [],
        transactions,
        users,
        roleRecords,
        shares: enrichedShares,
        stats: {
          companies: companiesRes.data?.length || 0,
          users: users.length,
          pendingTransactions: transactions.filter((transaction) => transaction.status === "pending").length,
          totalWalletBalance: wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0),
        },
      };
    },
  });

  const pendingTransactions = useMemo(
    () => data?.transactions.filter((transaction) => transaction.status === "pending") || [],
    [data?.transactions],
  );

  const resetCompanyForm = () => {
    setEditingCompanyId(null);
    setCompanyForm(emptyCompanyForm);
  };

  const invalidateAdminQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] }),
      queryClient.invalidateQueries({ queryKey: ["companies"] }),
      queryClient.invalidateQueries({ queryKey: ["featured-companies"] }),
    ]);
  };

  const companyMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...companyForm,
        total_shares: Number(companyForm.total_shares),
        available_shares: Number(companyForm.available_shares),
        price_per_share: Number(companyForm.price_per_share),
        previous_price: Number(companyForm.previous_price || companyForm.price_per_share),
      };

      if (!payload.name || !payload.registre_commerce || !payload.country || !payload.city || !payload.sector) {
        throw new Error("Veuillez remplir les informations principales de l'entreprise.");
      }

      if (payload.available_shares > payload.total_shares) {
        throw new Error("Les titres disponibles ne peuvent pas dépasser le total.");
      }

      if (editingCompanyId) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editingCompanyId);
        if (error) throw error;
        return "Entreprise mise à jour.";
      }

      const { error } = await supabase.from("companies").insert({
        ...payload,
        created_by: user?.id,
      });
      if (error) throw error;
      return "Entreprise créée.";
    },
    onSuccess: async (message) => {
      toast.success(message);
      resetCompanyForm();
      await invalidateAdminQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleCompanyStatusMutation = useMutation({
    mutationFn: async ({ companyId, nextStatus }: { companyId: string; nextStatus: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_active: nextStatus }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Statut de l'entreprise mis à jour.");
      await invalidateAdminQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const paymentServiceMutation = useMutation({
    mutationFn: async () => {
      if (!serviceForm.name || !serviceForm.contact) {
        throw new Error("Le nom du service et le contact sont requis.");
      }

      const { error } = await supabase.from("payment_services").insert({
        ...serviceForm,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Service de paiement ajouté.");
      setServiceForm(emptyServiceForm);
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-services"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!role) throw new Error("Choisissez un rôle avant validation.");

      const alreadyAssigned = data?.roleRecords.some((record) => record.user_id === userId && record.role === role);
      if (alreadyAssigned) {
        throw new Error("Ce rôle est déjà attribué à cet utilisateur.");
      }

      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role,
        assigned_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Rôle attribué.");
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const matchingRole = data?.roleRecords.find((record) => record.user_id === userId && record.role === role);
      if (!matchingRole) throw new Error("Rôle introuvable.");

      const { error } = await supabase.from("user_roles").delete().eq("id", matchingRole.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Rôle retiré.");
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const processTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, decision }: { transactionId: string; decision: "approved" | "rejected" }) =>
      invokePlatformAction("admin_process_transaction", {
        transactionId,
        decision,
      }),
    onSuccess: async () => {
      toast.success("Demande traitée.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (authLoading || (isAdmin && isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 text-center">
          <div className="glass-card max-w-lg mx-auto p-10">
            <Shield className="mx-auto h-14 w-14 text-primary mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Connexion requise</h1>
            <p className="text-muted-foreground mb-6">Connectez-vous avec le compte administrateur pour ouvrir l'espace de gestion.</p>
            <Link to="/login">
              <Button variant="gold">Se connecter</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 text-center">
          <div className="glass-card max-w-lg mx-auto p-10">
            <Shield className="mx-auto h-14 w-14 text-destructive mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Accès restreint</h1>
            <p className="text-muted-foreground mb-6">Cette zone est réservée aux administrateurs de la plateforme.</p>
            <Link to="/dashboard">
              <Button variant="outline">Retour au tableau de bord</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord utilisateur
            </Link>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Administration MSN Hors Cote</h1>
            <p className="text-muted-foreground mt-2">Gérez les entreprises partenaires, les rôles, les demandes de portefeuille et les titres détenus.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard title="Entreprises" value={`${data?.stats.companies || 0}`} icon={<Building2 className="h-5 w-5 text-primary" />} />
          <StatCard title="Utilisateurs" value={`${data?.stats.users || 0}`} icon={<Users className="h-5 w-5 text-primary" />} />
          <StatCard title="Demandes en attente" value={`${data?.stats.pendingTransactions || 0}`} icon={<CreditCard className="h-5 w-5 text-primary" />} />
          <StatCard title="Soldes cumulés" value={formatCurrency(data?.stats.totalWalletBalance || 0)} icon={<Wallet className="h-5 w-5 text-primary" />} />
        </div>

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-xl bg-secondary p-2 md:grid-cols-5">
            <TabsTrigger value="companies">Entreprises</TabsTrigger>
            <TabsTrigger value="transactions">Demandes</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="shares">Titres</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
              <div className="glass-card p-6 space-y-4">
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">{editingCompanyId ? "Modifier une entreprise" : "Ajouter une entreprise"}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Chaque entreprise ajoutée apparaîtra automatiquement dans l'annuaire.</p>
                </div>

                <Input placeholder="Nom de l'entreprise" value={companyForm.name} onChange={(event) => setCompanyForm((prev) => ({ ...prev, name: event.target.value }))} />
                <Input placeholder="Registre de commerce" value={companyForm.registre_commerce} onChange={(event) => setCompanyForm((prev) => ({ ...prev, registre_commerce: event.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Pays" value={companyForm.country} onChange={(event) => setCompanyForm((prev) => ({ ...prev, country: event.target.value }))} />
                  <Input placeholder="Ville" value={companyForm.city} onChange={(event) => setCompanyForm((prev) => ({ ...prev, city: event.target.value }))} />
                </div>

                <Input placeholder="Localisation" value={companyForm.location} onChange={(event) => setCompanyForm((prev) => ({ ...prev, location: event.target.value }))} />

                <Select value={companyForm.sector} onValueChange={(value) => setCompanyForm((prev) => ({ ...prev, sector: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Secteur d'activité" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_SECTORS.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Description, branding, activités, points forts..."
                  value={companyForm.description}
                  onChange={(event) => setCompanyForm((prev) => ({ ...prev, description: event.target.value }))}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Total titres"
                    value={companyForm.total_shares}
                    onChange={(event) => setCompanyForm((prev) => ({ ...prev, total_shares: Number(event.target.value) }))}
                  />
                  <Input
                    type="number"
                    placeholder="Titres disponibles"
                    value={companyForm.available_shares}
                    onChange={(event) => setCompanyForm((prev) => ({ ...prev, available_shares: Number(event.target.value) }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Prix actuel"
                    value={companyForm.price_per_share}
                    onChange={(event) => setCompanyForm((prev) => ({ ...prev, price_per_share: Number(event.target.value) }))}
                  />
                  <Input
                    type="number"
                    placeholder="Prix précédent"
                    value={companyForm.previous_price}
                    onChange={(event) => setCompanyForm((prev) => ({ ...prev, previous_price: Number(event.target.value) }))}
                  />
                </div>

                <Input placeholder="URL du logo" value={companyForm.logo_url} onChange={(event) => setCompanyForm((prev) => ({ ...prev, logo_url: event.target.value }))} />
                <Input placeholder="URL vidéo (optionnel)" value={companyForm.video_url} onChange={(event) => setCompanyForm((prev) => ({ ...prev, video_url: event.target.value }))} />

                <div className="flex gap-3">
                  <Button className="flex-1" variant="gold" onClick={() => companyMutation.mutate()} disabled={companyMutation.isPending}>
                    {companyMutation.isPending ? "Enregistrement..." : editingCompanyId ? "Mettre à jour" : "Créer l'entreprise"}
                  </Button>
                  {editingCompanyId && (
                    <Button variant="outline" onClick={resetCompanyForm}>
                      Annuler
                    </Button>
                  )}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-semibold text-foreground">Catalogue des entreprises</h2>
                  <Badge variant="secondary">{data?.companies.length || 0} fiche(s)</Badge>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Secteur</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Titres</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{company.name}</p>
                            <p className="text-xs text-muted-foreground">{company.city}, {company.country}</p>
                          </div>
                        </TableCell>
                        <TableCell>{company.sector}</TableCell>
                        <TableCell>{formatCurrency(Number(company.price_per_share))}</TableCell>
                        <TableCell>{company.available_shares}/{company.total_shares}</TableCell>
                        <TableCell>
                          <Badge variant={company.is_active ? "default" : "outline"}>{company.is_active ? "Actif" : "Masqué"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCompanyId(company.id);
                                setCompanyForm({
                                  name: company.name,
                                  registre_commerce: company.registre_commerce,
                                  country: company.country,
                                  city: company.city,
                                  location: company.location,
                                  sector: company.sector,
                                  description: company.description,
                                  total_shares: company.total_shares,
                                  available_shares: company.available_shares,
                                  price_per_share: Number(company.price_per_share),
                                  previous_price: Number(company.previous_price),
                                  logo_url: company.logo_url || "",
                                  video_url: company.video_url || "",
                                  is_active: company.is_active,
                                });
                              }}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCompanyStatusMutation.mutate({ companyId: company.id, nextStatus: !company.is_active })}
                              disabled={toggleCompanyStatusMutation.isPending}
                            >
                              {company.is_active ? "Masquer" : "Publier"}
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

          <TabsContent value="transactions" className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl font-semibold text-foreground">Demandes de portefeuille</h2>
                <Badge variant="secondary">{pendingTransactions.length} en attente</Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.transactions.map((transaction) => {
                    const owner = data.users.find((profile) => profile.user_id === transaction.user_id);

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="capitalize">{transaction.type}</TableCell>
                        <TableCell>{formatCurrency(Number(transaction.amount))}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{owner?.first_name || "Utilisateur"} {owner?.last_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{owner?.msn_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {transaction.payment_contact && <p>Contact: {transaction.payment_contact}</p>}
                            {transaction.payment_transaction_id && <p>Réf: {transaction.payment_transaction_id}</p>}
                            {transaction.recipient_msn_id && <p>Destinataire: {transaction.recipient_msn_id}</p>}
                            {transaction.description && <p>{transaction.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === "approved" ? "default" : transaction.status === "pending" ? "secondary" : "destructive"}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="gold"
                                onClick={() => processTransactionMutation.mutate({ transactionId: transaction.id, decision: "approved" })}
                                disabled={processTransactionMutation.isPending}
                              >
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => processTransactionMutation.mutate({ transactionId: transaction.id, decision: "rejected" })}
                                disabled={processTransactionMutation.isPending}
                              >
                                Refuser
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Traitée</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl font-semibold text-foreground">Utilisateurs & rôles</h2>
                <Badge variant="secondary">{data?.users.length || 0} profil(s)</Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Portefeuille</TableHead>
                    <TableHead>Rôles</TableHead>
                    <TableHead className="text-right">Attribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users.map((profile) => (
                    <TableRow key={profile.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{profile.first_name} {profile.last_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{profile.msn_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{profile.phone || "—"}</TableCell>
                      <TableCell>{formatCurrency(profile.walletBalance)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {profile.roles.length === 0 ? (
                            <Badge variant="outline">Aucun rôle</Badge>
                          ) : (
                            profile.roles.map((role) => (
                              <div key={`${profile.user_id}-${role}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-xs text-foreground">
                                <span>{role}</span>
                                {role !== "admin" && (
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => removeRoleMutation.mutate({ userId: profile.user_id, role })}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Select
                            value={selectedRoles[profile.user_id] || ""}
                            onValueChange={(value) => setSelectedRoles((prev) => ({ ...prev, [profile.user_id]: value }))}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="Choisir un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              {APP_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => roleMutation.mutate({ userId: profile.user_id, role: selectedRoles[profile.user_id] })}
                            disabled={roleMutation.isPending}
                          >
                            Attribuer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="shares" className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl font-semibold text-foreground">Titres & propriétaires</h2>
                <Badge variant="secondary">{data?.shares.length || 0} ligne(s)</Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Numéro d'ordre</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.shares.map((share) => (
                    <TableRow key={share.id}>
                      <TableCell>{(share.companies as { name?: string } | null)?.name || "Entreprise"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{share.owner?.first_name || "Utilisateur"} {share.owner?.last_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{share.owner?.msn_id || share.user_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{share.order_number}</TableCell>
                      <TableCell>{share.quantity}</TableCell>
                      <TableCell>{formatCurrency(Number(share.purchase_price))}</TableCell>
                      <TableCell>{new Date(share.purchase_date).toLocaleString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
              <div className="glass-card p-6 space-y-4">
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Ajouter un service de paiement</h2>
                  <p className="text-sm text-muted-foreground mt-1">Ces services seront proposés dans les formulaires de recharge.</p>
                </div>

                <Input placeholder="Nom du service" value={serviceForm.name} onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))} />
                <Input placeholder="Contact" value={serviceForm.contact} onChange={(event) => setServiceForm((prev) => ({ ...prev, contact: event.target.value }))} />
                <Input placeholder="Lien de paiement cliquable" value={serviceForm.payment_link} onChange={(event) => setServiceForm((prev) => ({ ...prev, payment_link: event.target.value }))} />
                <Textarea placeholder="Instructions visibles pour l'utilisateur" value={serviceForm.instructions} onChange={(event) => setServiceForm((prev) => ({ ...prev, instructions: event.target.value }))} />

                <Button variant="gold" onClick={() => paymentServiceMutation.mutate()} disabled={paymentServiceMutation.isPending}>
                  {paymentServiceMutation.isPending ? "Enregistrement..." : "Ajouter le service"}
                </Button>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-semibold text-foreground">Services actifs</h2>
                  <Badge variant="secondary">{data?.paymentServices.length || 0} service(s)</Badge>
                </div>

                <div className="space-y-4">
                  {data?.paymentServices.map((service) => (
                    <div key={service.id} className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <BadgeCheck className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-foreground">{service.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">Contact: {service.contact}</p>
                          {service.payment_link && (
                            <a href={service.payment_link} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                              Ouvrir le lien de paiement
                            </a>
                          )}
                          {service.instructions && <p className="text-sm text-muted-foreground mt-2">{service.instructions}</p>}
                        </div>
                        <Badge variant={service.is_active ? "default" : "outline"}>{service.is_active ? "Actif" : "Inactif"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;