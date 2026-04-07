import Navbar from "@/components/Navbar";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, FileText, TrendingUp, TrendingDown, ArrowLeft, ShoppingCart, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { invokePlatformAction } from "@/lib/platform-actions";

const CompanyDetail = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const buyMutation = useMutation({
    mutationFn: async () => invokePlatformAction<{ orderNumber: string }>("purchase_company_shares", {
      companyId: id,
      quantity,
    }),
    onSuccess: async (response) => {
      toast.success(`Achat confirmé. Référence: ${response.orderNumber}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company", id] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["user_shares"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
      navigate("/dashboard");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-xl">Entreprise non trouvée.</p>
          <Link to="/entreprises"><Button variant="gold-outline" className="mt-4">Retour</Button></Link>
        </div>
      </div>
    );
  }

  const pricePerShare = Number(company.price_per_share);
  const previousPrice = Number(company.previous_price);
  const priceChange = pricePerShare - previousPrice;
  const priceChangePercent = previousPrice > 0 ? ((priceChange / previousPrice) * 100).toFixed(2) : "0";
  const isPositive = priceChange >= 0;
  const totalCost = quantity * pricePerShare;
  const soldPercent = company.total_shares > 0 
    ? ((company.total_shares - company.available_shares) / company.total_shares * 100).toFixed(1) 
    : "0";

  const handleBuy = () => {
    if (!user) {
      toast.error("Connectez-vous pour acheter des titres.");
      navigate("/login");
      return;
    }

    if (company.available_shares <= 0) {
      toast.error("Cette entreprise n'a plus de titres disponibles.");
      return;
    }

    buyMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4">
        <Link to="/entreprises" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux entreprises
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-10 w-10 text-primary" />
                  )}
                </div>
                <div>
                  <h1 className="font-heading text-3xl font-bold text-foreground">{company.name}</h1>
                  <p className="text-primary font-medium">{company.sector}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {company.location}, {company.city}, {company.country}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">{company.description}</p>
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Registre de Commerce: <span className="text-foreground font-mono">{company.registre_commerce}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Prix / Action", value: `${pricePerShare.toLocaleString()} FCFA`, highlight: true },
                { label: "Total Actions", value: company.total_shares.toLocaleString() },
                { label: "Disponibles", value: company.available_shares.toLocaleString() },
                { label: "Vendues", value: `${soldPercent}%` },
              ].map((s, i) => (
                <div key={i} className="glass-card p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`font-heading font-bold text-xl ${s.highlight ? "text-primary" : "text-foreground"}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="glass-card p-6">
              <h3 className="font-heading font-semibold text-foreground mb-4">Évolution du prix</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-muted-foreground">Prix actuel</p>
                  <p className="font-heading text-2xl font-bold text-primary">{pricePerShare.toLocaleString()} FCFA</p>
                </div>
                {previousPrice > 0 && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Prix précédent</p>
                      <p className="font-heading text-lg text-muted-foreground">{previousPrice.toLocaleString()} FCFA</p>
                    </div>
                    <div className={`flex items-center gap-1 text-lg font-semibold ${isPositive ? "text-success" : "text-destructive"}`}>
                      {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      {isPositive ? "+" : ""}{priceChangePercent}%
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6 border-primary/20 animate-pulse-gold">
              <h3 className="font-heading font-semibold text-lg text-foreground mb-6">Acheter des actions</h3>
              <div className="mb-6">
                <label className="text-sm text-muted-foreground mb-2 block">Nombre d'actions</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <input type="number" value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(company.available_shares, parseInt(e.target.value) || 1)))}
                    className="flex-1 text-center py-2 rounded-lg bg-secondary border border-border text-foreground font-heading font-bold text-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button onClick={() => setQuantity(Math.min(company.available_shares, quantity + 1))}
                    className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prix unitaire</span>
                  <span className="text-foreground">{pricePerShare.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantité</span>
                  <span className="text-foreground">x {quantity}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-heading font-bold text-primary text-lg">{totalCost.toLocaleString()} FCFA</span>
                </div>
              </div>

               <Button variant="gold" size="lg" className="w-full" onClick={handleBuy} disabled={buyMutation.isPending || company.available_shares <= 0}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                 {buyMutation.isPending ? "Traitement..." : company.available_shares <= 0 ? "Indisponible" : "Acheter maintenant"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                 L'achat débite le portefeuille et génère une référence unique liée au titre.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;
