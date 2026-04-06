import { Building2, TrendingUp, TrendingDown, MapPin } from "lucide-react";
import { Company } from "@/types/company";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface CompanyCardProps {
  company: Company;
}

const CompanyCard = ({ company }: CompanyCardProps) => {
  const priceChange = company.pricePerShare - company.previousPrice;
  const priceChangePercent = company.previousPrice > 0 ? ((priceChange / company.previousPrice) * 100).toFixed(2) : "0";
  const isPositive = priceChange >= 0;
  const soldShares = company.totalShares - company.availableShares;
  const soldPercent = company.totalShares > 0 ? (soldShares / company.totalShares) * 100 : 0;

  return (
    <div className="glass-card p-6 hover:border-primary/30 transition-all duration-300 group animate-scale-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
              {company.name}
            </h3>
            <p className="text-xs text-muted-foreground">{company.sector}</p>
          </div>
        </div>
        {company.previousPrice > 0 && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-success" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? "+" : ""}{priceChangePercent}%
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{company.description}</p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <MapPin className="h-3 w-3" />
        {company.city}, {company.country}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Prix / Action</p>
          <p className="font-heading font-bold text-primary text-lg">
            {company.pricePerShare.toLocaleString()} <span className="text-xs text-muted-foreground">FCFA</span>
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Actions disponibles</p>
          <p className="font-heading font-bold text-foreground text-lg">
            {company.availableShares.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Vendues</span>
          <span>{soldPercent.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-gold rounded-full transition-all duration-500"
            style={{ width: `${soldPercent}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Link to={`/entreprises/${company.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">Détails</Button>
        </Link>
        <Link to={`/entreprises/${company.id}`} className="flex-1">
          <Button variant="gold" size="sm" className="w-full">Acheter</Button>
        </Link>
      </div>
    </div>
  );
};

export default CompanyCard;
