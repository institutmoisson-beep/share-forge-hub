import { Shield, BarChart3, Users, Globe, ArrowRight, TrendingUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo.png";
import Navbar from "@/components/Navbar";
import CompanyCard from "@/components/CompanyCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: companies = [] } = useQuery({
    queryKey: ["featured-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [companiesRes, sharesRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("user_shares").select("id", { count: "exact", head: true }),
      ]);
      return {
        companies: companiesRes.count || 0,
        investments: sharesRes.count || 0,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-navy opacity-70" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="animate-fade-in">
            <img src={logo} alt="MSN Hors Cote" className="h-24 w-24 mx-auto mb-6" />
            <h1 className="font-heading text-5xl md:text-7xl font-bold mb-4">
              <span className="text-gradient-gold">MSN</span>{" "}
              <span className="text-foreground">Hors Cote</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4">
               Plateforme de Participation Privée
            </p>
            <p className="text-muted-foreground max-w-xl mx-auto mb-10">
               Participez au financement des entreprises partenaires non cotées sur le marché public.
               Achetez, revendez et gérez vos titres en toute sécurité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/entreprises">
                <Button variant="gold" size="xl">
                  <Building2 className="mr-2 h-5 w-5" />
                  Explorer les entreprises
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="gold-outline" size="xl">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: <Building2 className="h-6 w-6 text-primary" />, value: `${stats?.companies || 0}`, label: "Entreprises Partenaires" },
            { icon: <Users className="h-6 w-6 text-primary" />, value: `${stats?.investments || 0}`, label: "Participations" },
            { icon: <TrendingUp className="h-6 w-6 text-primary" />, value: "FCFA", label: "Transactions sécurisées" },
            { icon: <Shield className="h-6 w-6 text-primary" />, value: "100%", label: "Sécurisé" },
          ].map((stat, i) => (
            <div key={i} className="text-center animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                {stat.icon}
              </div>
              <p className="font-heading font-bold text-3xl text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Companies */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Entreprises <span className="text-gradient-gold">Partenaires</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Découvrez les entreprises dans lesquelles vous pouvez participer et devenir détenteur de titres.
          </p>
        </div>

        {companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
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
        ) : (
          <div className="text-center py-12 glass-card">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">Aucune entreprise disponible pour le moment.</p>
            <p className="text-sm text-muted-foreground">Les entreprises seront ajoutées par l'administrateur.</p>
          </div>
        )}

        {companies.length > 0 && (
          <div className="text-center mt-10">
            <Link to="/entreprises">
              <Button variant="gold-outline" size="lg">
                Voir toutes les entreprises
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-card/30 border-y border-border py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            Comment ça <span className="text-gradient-gold">fonctionne</span> ?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Créez votre compte", desc: "Inscrivez-vous gratuitement et rechargez votre portefeuille intégré." },
              { step: "02", title: "Choisissez une entreprise", desc: "Parcourez l'annuaire des entreprises partenaires et analysez les opportunités." },
              { step: "03", title: "Participez & Gérez", desc: "Achetez des titres, suivez vos rendements et revendez sur le marché secondaire." },
            ].map((item, i) => (
              <div key={i} className="glass-card p-8 text-center animate-slide-up" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="text-5xl font-heading font-bold text-gradient-gold mb-4">{item.step}</div>
                <h3 className="font-heading font-semibold text-xl text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="MSN" className="h-8 w-8" />
              <span className="font-heading font-bold text-gradient-gold">MSN Hors Cote</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 MSN Hors Cote. Tous droits réservés. Plateforme de participation privée.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
