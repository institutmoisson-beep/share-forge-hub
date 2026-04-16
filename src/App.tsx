import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import EntreprisesPage from "./pages/Entreprises.tsx";
import CompanyDetail from "./pages/CompanyDetail.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import LoginPage from "./pages/Login.tsx";
import RegisterPage from "./pages/Register.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/entreprises" element={<EntreprisesPage />} />
            <Route path="/entreprises/:id" element={<CompanyDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
