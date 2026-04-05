import Navbar from "@/components/Navbar";
import { mockCompanies, mockUserShares } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { ShoppingCart, TrendingUp, TrendingDown, ArrowLeftRight, Search, Filter } from "lucide-react";
import { useState } from "react";

interface P2PListing {
  id: string;
  seller: string;
  companyName: string;
  companyId: string;
  quantity: number;
  pricePerShare: number;
  marketPrice: number;
  date: string;
}

const mockListings: P2PListing[] = [
  { id: "p1", seller: "MSN-HC-789012", companyName: "AfriTech Solutions", companyId: "1", quantity: 10, pricePerShare: 14500, marketPrice: 15000, date: "2024-09-10" },
  { id: "p2", seller: "MSN-HC-345678", companyName: "AgriGold Farms", companyId: "3", quantity: 50, pricePerShare: 4800, marketPrice: 5000, date: "2024-09-12" },
  { id: "p3", seller: "MSN-HC-901234", companyName: "MediCare Plus", companyId: "4", quantity: 5, pricePerShare: 24000, marketPrice: 25000, date: "2024-09-14" },
  { id: "p4", seller: "MSN-HC-567890", companyName: "BuildPro Construction", companyId: "5", quantity: 30, pricePerShare: 11800, marketPrice: 12000, date: "2024-09-15" },
  { id: "p5", seller: "MSN-HC-234567", companyName: "FinanceHub Africa", companyId: "6", quantity: 15, pricePerShare: 19500, marketPrice: 20000, date: "2024-09-16" },
];

const Marketplace = () => {
  const [search, setSearch] = useState("");

  const filtered = mockListings.filter((l) =>
    l.companyName.toLowerCase().includes(search.toLowerCase()) ||
    l.seller.toLowerCase().includes(search.toLowerCase())
  );

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
            <input
              type="text"
              placeholder="Rechercher par entreprise ou vendeur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button variant="gold" size="default">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Vendre mes actions
          </Button>
        </div>

        <div className="space-y-4">
          {filtered.map((listing) => {
            const discount = ((listing.marketPrice - listing.pricePerShare) / listing.marketPrice * 100).toFixed(1);
            const total = listing.quantity * listing.pricePerShare;
            return (
              <div key={listing.id} className="glass-card p-6 hover:border-primary/30 transition-all animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-heading font-semibold text-lg text-foreground">{listing.companyName}</h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-success/10 text-success font-medium">
                        -{discount}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>Vendeur: <span className="text-foreground font-mono">{listing.seller}</span></span>
                      <span>Quantité: <span className="text-foreground font-semibold">{listing.quantity}</span></span>
                      <span>Date: {listing.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Prix demandé</p>
                      <p className="font-heading font-bold text-xl text-primary">{listing.pricePerShare.toLocaleString()} FCFA</p>
                      <p className="text-xs text-muted-foreground line-through">{listing.marketPrice.toLocaleString()} FCFA marché</p>
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
      </div>
    </div>
  );
};

export default Marketplace;
