import Navbar from "@/components/Navbar";
import CompanyCard from "@/components/CompanyCard";
import { ACTIVITY_SECTORS } from "@/data/sectors";
import { Search, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EntreprisesPage = () => {
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase());
      const matchSector = !selectedSector || c.sector === selectedSector;
      return matchSearch && matchSector;
    });
  }, [search, selectedSector, companies]);

  const usedSectors = [...new Set(companies.map((c) => c.sector))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">
            <Building2 className="inline h-10 w-10 text-primary mr-3" />
            Entreprises <span className="text-gradient-gold">Partenaires</span>
          </h1>
          <p className="text-muted-foreground">Explorez toutes les entreprises et investissez dans leurs actions.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="text" placeholder="Rechercher une entreprise..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}
            className="px-4 py-3 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Tous les secteurs</option>
            {usedSectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">{filtered.length} entreprise(s) trouvée(s)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((company) => (
                <CompanyCard key={company.id} company={{
                  id: company.id,
                  name: company.name,
                  registreCommerce: company.registre_commerce,
                  country: company.country,
                  city: company.city,
                  location: company.location,
                  sector: company.sector,
                  totalShares: company.total_shares,
                  availableShares: company.available_shares,
                  pricePerShare: Number(company.price_per_share),
                  previousPrice: Number(company.previous_price),
                  logo: company.logo_url || "",
                  description: company.description,
                  createdAt: company.created_at,
                }} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">Aucune entreprise trouvée.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EntreprisesPage;
