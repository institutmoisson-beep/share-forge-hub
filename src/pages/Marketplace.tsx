import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeftRight, Search, Building2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { invokePlatformAction } from "@/lib/platform-actions";

const Marketplace = () => {
  const [search, setSearch] = useState("");
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellForm, setSellForm] = useState({ user_share_id: "", quantity: "", price_per_share: "" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["p2p-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("p2p_listings")
        .select("*, companies(name, price_per_share)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      if (rows.length === 0) return [];

      const sellerIds = [...new Set(rows.map((listing) => listing.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, msn_id, first_name, last_name").in("user_id", sellerIds);
      const profilesByUserId = (profiles || []).reduce<Record<string, { msn_id: string; first_name: string; last_name: string }>>((acc, profile) => {
        acc[profile.user_id] = {
          msn_id: profile.msn_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
        };
        return acc;
      }, {});

      return rows.map((listing) => ({
        ...listing,
        sellerProfile: profilesByUserId[listing.seller_id],
      }));
    },
    enabled: !!user && !authLoading,
  });

  const { data: userShares = [] } = useQuery({
    queryKey: ["marketplace-user-shares", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_shares").select("*, companies(name, price_per_share)").eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !authLoading,
  });

  const filtered = listings.filter((l) => {
    const companyName = (l.companies as any)?.name || "";
    const sellerMsn = l.sellerProfile?.msn_id || "";
    return companyName.toLowerCase().includes(search.toLowerCase()) ||
      sellerMsn.toLowerCase().includes(search.toLowerCase());
  });

  const buyMutation = useMutation({
    mutationFn: async (listingId: string) => invokePlatformAction<{ orderNumber: string }>("purchase_listing", { listingId }),
    onSuccess: async (response) => {
      toast.success(`Achat confirmé. Référence: ${response.orderNumber}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["p2p-listings"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["user_shares"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
      navigate("/dashboard");
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
      toast.success("Votre annonce a été publiée.");
      setSellDialogOpen(false);
      setSellForm({ user_share_id: "", quantity: "", price_per_share: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["p2p-listings"] }),
        queryClient.invalidateQueries({ queryKey: ["marketplace-user-shares"] }),
        queryClient.invalidateQueries({ queryKey: ["my-active-listings"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 container mx-auto px-4 text-center">
          <div className="glass-card p-12 max-w-lg mx-auto">
            <ArrowLeftRight className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-heading text-3xl font-bold text-foreground mb-3">Marché secondaire</h1>
            <p className="text-muted-foreground mb-6">Connectez-vous pour publier vos titres et acheter les annonces disponibles.</p>
            <Link to="/login">
              <Button variant="gold">Se connecter</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">
            <ArrowLeftRight className="inline h-10 w-10 text-primary mr-3" />
            Marché <span className="text-gradient-gold">secondaire</span>
          </h1>
          <p className="text-muted-foreground">Achetez et revendez des titres directement entre membres.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="text" placeholder="Rechercher par entreprise ou vendeur..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <Button variant="gold" size="default" onClick={() => setSellDialogOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Vendre mes actions
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass-card">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">Aucune action en vente pour le moment.</p>
            <p className="text-sm text-muted-foreground">Les utilisateurs peuvent mettre en vente leurs actions ici.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((listing) => {
              const companyName = (listing.companies as any)?.name || "Entreprise";
              const marketPrice = Number((listing.companies as any)?.price_per_share || listing.price_per_share);
              const askPrice = Number(listing.price_per_share);
              const discount = marketPrice > 0 ? ((marketPrice - askPrice) / marketPrice * 100).toFixed(1) : "0";
              const total = listing.quantity * askPrice;
               const sellerMsn = listing.sellerProfile?.msn_id || "N/A";

              return (
                <div key={listing.id} className="glass-card p-6 hover:border-primary/30 transition-all animate-fade-in">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-heading font-semibold text-lg text-foreground">{companyName}</h3>
                        {Number(discount) > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-success/10 text-success font-medium">-{discount}%</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Vendeur: <span className="text-foreground font-mono">{sellerMsn}</span></span>
                        <span>Quantité: <span className="text-foreground font-semibold">{listing.quantity}</span></span>
                        <span>Date: {new Date(listing.created_at).toLocaleDateString("fr")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Prix demandé</p>
                        <p className="font-heading font-bold text-xl text-primary">{askPrice.toLocaleString()} FCFA</p>
                        <p className="text-xs text-muted-foreground line-through">{marketPrice.toLocaleString()} FCFA marché</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-heading font-bold text-foreground">{total.toLocaleString()} FCFA</p>
                      </div>
                       <Button variant="gold" size="sm" onClick={() => buyMutation.mutate(listing.id)} disabled={buyMutation.isPending || listing.seller_id === user?.id}>
                         {listing.seller_id === user?.id ? "Votre annonce" : buyMutation.isPending ? "Traitement..." : "Acheter"}
                       </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publier une annonce</DialogTitle>
              <DialogDescription>Sélectionnez les titres à céder et définissez votre prix unitaire.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={sellForm.user_share_id} onValueChange={(value) => {
                const share = userShares.find((item) => item.id === value);
                setSellForm({
                  user_share_id: value,
                  quantity: share ? String(share.quantity) : "",
                  price_per_share: share ? String(Number(share.companies?.price_per_share || share.purchase_price)) : "",
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une ligne de titres" />
                </SelectTrigger>
                <SelectContent>
                  {userShares.map((share) => (
                    <SelectItem key={share.id} value={share.id}>
                      {(share.companies?.name || "Entreprise")} • {share.quantity} titre(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Quantité" value={sellForm.quantity} onChange={(event) => setSellForm((prev) => ({ ...prev, quantity: event.target.value }))} />
              <Input type="number" placeholder="Prix par titre" value={sellForm.price_per_share} onChange={(event) => setSellForm((prev) => ({ ...prev, price_per_share: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSellDialogOpen(false)}>Annuler</Button>
              <Button variant="gold" onClick={() => sellMutation.mutate()} disabled={sellMutation.isPending || userShares.length === 0}>
                {sellMutation.isPending ? "Publication..." : "Publier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Marketplace;
