import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

import CourtierDashboard from "@/pages/dashboards/CourtierDashboard";
import FinancierDashboard from "@/pages/dashboards/FinancierDashboard";
import GestionnaireEntreprisesDashboard from "@/pages/dashboards/GestionnaireEntreprisesDashboard";
import GenericRoleDashboard from "@/pages/dashboards/GenericRoleDashboard";
import MemberDashboard from "@/pages/dashboards/MemberDashboard";

const ROLE_PRIORITY = [
  "courtier",
  "financier",
  "gestionnaire_entreprises",
  "gestionnaire_utilisateurs",
  "gestionnaire_achats",
  "moderateur",
  "communication",
  "comptable",
  "consultant",
  "informaticien",
] as const;

const GENERIC_ROLES = [
  "gestionnaire_utilisateurs",
  "gestionnaire_achats",
  "moderateur",
  "communication",
  "comptable",
  "consultant",
  "informaticien",
];

const Dashboard = () => {
  const { user, roles, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  const isAdmin = hasRole("admin") || user?.email === "picelvus@gmail.com";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
    if (!loading && user && isAdmin) {
      navigate("/admin");
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Chargement de votre espace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (isAdmin) return null;

  const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r));

  if (primaryRole === "courtier") return <CourtierDashboard />;
  if (primaryRole === "financier") return <FinancierDashboard />;
  if (primaryRole === "gestionnaire_entreprises") return <GestionnaireEntreprisesDashboard />;
  if (primaryRole && GENERIC_ROLES.includes(primaryRole)) return <GenericRoleDashboard role={primaryRole} />;

  return <MemberDashboard />;
};

export default Dashboard;
