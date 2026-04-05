import { Shield, BarChart3, Users, Globe, ArrowRight, TrendingUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo.png";
import Navbar from "@/components/Navbar";
import { mockCompanies } from "@/data/mockData";
import CompanyCard from "@/components/CompanyCard";

const Index = () => {
  const featuredCompanies = mockCompanies.slice(0, 3);

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
              Plateforme d'Investissement Participatif Privé
            </p>
            <p className="text-muted-foreground max-w-xl mx-auto mb-10">
              Investissez dans les entreprises partenaires non cotées en bourse. 
              Achetez, vendez et gérez vos titres en toute sécurité.
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
            { icon: <Building2 className="h-6 w-6 text-primary" />, value: "50+", label: "Entreprises Partenaires" },
            { icon: <Users className="h-6 w-6 text-primary" />, value: "2,500+", label: "Investisseurs Actifs" },
            { icon: <TrendingUp className="h-6 w-6 text-primary" />, value: "15M+", label: "FCFA en Transactions" },
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
            Découvrez les entreprises dans lesquelles vous pouvez investir et devenez actionnaire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/entreprises">
            <Button variant="gold-outline" size="lg">
              Voir toutes les entreprises
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
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
              { step: "03", title: "Investissez & Gérez", desc: "Achetez des actions, suivez vos rendements et vendez sur le marketplace P2P." },
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
              © 2024 MSN Hors Cote. Tous droits réservés. Plateforme d'investissement participatif privé.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
