import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeftRight, Search, Building2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Marketplace = () => {
  const [search, setSearch] = useState("");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["p2p-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("p2p_listings")
        .select("*, companies(name, price_per_share), profiles:seller_id(msn_id, first_name, last_name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = listings.filter((l) => {
    const companyName = (l.companies as any)?.name || "";
    const sellerMsn = (l.profiles as any)?.msn_id || "";
    return companyName.toLowerCase().includes(search.toLowerCase()) ||
      sellerMsn.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">
            <ArrowLeftRight className="inline h-10 w-10 text-primary mr-3" />
            Marketplace <span className="text-gradient-gold">P2P</span>
          </h1>
          <p className="text-muted-foreground">Achetez et vendez des actions directement entre utilisateurs.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="text" placeholder="Rechercher par entreprise ou vendeur..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <Button variant="gold" size="default">
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
              const sellerMsn = (listing.profiles as any)?.msn_id || "N/A";

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
                      <Button variant="gold" size="sm">Acheter</Button>
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

export default Marketplace;
