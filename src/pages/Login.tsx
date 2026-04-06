import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : error.message);
    } else {
      toast.success("Connexion réussie !");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Navbar />
      <div className="w-full max-w-md px-4">
        <div className="glass-card p-8 animate-scale-in">
          <div className="text-center mb-8">
            <img src={logo} alt="MSN" className="h-16 w-16 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground">Connexion</h1>
            <p className="text-muted-foreground text-sm mt-1">Accédez à votre compte MSN Hors Cote</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <Button variant="gold" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas de compte ?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
