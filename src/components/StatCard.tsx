import { TrendingUp, TrendingDown, Wallet, Briefcase, BarChart3, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
}

const StatCard = ({ title, value, change, isPositive, icon }: StatCardProps) => (
  <div className="glass-card p-5 animate-fade-in">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground">{title}</span>
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <p className="font-heading font-bold text-2xl text-foreground">{value}</p>
    {change && (
      <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? "text-success" : "text-destructive"}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {change}
      </div>
    )}
  </div>
);

export default StatCard;
