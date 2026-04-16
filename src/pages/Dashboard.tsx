import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

// Role-specific dashboard imports
import CourtierDashboard from "@/pages/dashboards/CourtierDashboard";
import FinancierDashboard from "@/pages/dashboards/FinancierDashboard";
import GestionnaireEntreprisesDashboard from "@/pages/dashboards/GestionnaireEntreprisesDashboard";
import GenericRoleDashboard from "@/pages/dashboards/GenericRoleDashboard";
import MemberDashboard from "@/pages/dashboards/MemberDashboard";

// Priority order for role dashboards
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

const GENERIC_ROLES = ["gestionnaire_utilisateurs", "gestionnaire_achats", "moderateur", "communication", "comptable", "consultant", "informaticien"];

const Dashboard = () => {
  const { user, roles, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  // Admins go to /admin
  const isAdmin = hasRole("admin") || user?.email === "picelvus@gmail.com";

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

  if (!user) {
    navigate("/login");
    return null;
  }

  // Admin → redirect to admin panel
  if (isAdmin) {
    navigate("/admin");
    return null;
  }

  // Find the highest-priority role the user has
  const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r));

  // Route to role-specific dashboard
  if (primaryRole === "courtier") return <CourtierDashboard />;
  if (primaryRole === "financier") return <FinancierDashboard />;
  if (primaryRole === "gestionnaire_entreprises") return <GestionnaireEntreprisesDashboard />;
  if (primaryRole && GENERIC_ROLES.includes(primaryRole)) return <GenericRoleDashboard role={primaryRole} />;

  // Default: regular member dashboard
  return <MemberDashboard />;
};

export default Dashboard;
