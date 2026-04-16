import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, ChevronDown, ChevronUp, Edit, Eye, Globe, Loader2, Plus, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_SECTORS, type ActivitySector } from "@/data/sectors";
import ImageUpload from "@/components/ImageUpload";
import Navbar from "@/components/Navbar";

const fmtCurrency = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA";
const fmtShort = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : String(v);
const isActivitySector = (v: string): v is ActivitySector => (ACTIVITY_SECTORS as readonly string[]).includes(v);

type CompanyForm = { name: string; registre_commerce: string; country: string; city: string; location: string; sector: ActivitySector; description: string; total_shares: number; available_shares: number; price_per_share: number; previous_price: number; logo_url: string; video_url: string; is_active: boolean; };
const emptyForm: CompanyForm = { name: "", registre_commerce: "", country: "", city: "", location: "", sector: ACTIVITY_SECTORS[0], description: "", total_shares: 0, available_shares: 0, price_per_share: 0, previous_price: 0, logo_url: "", video_url: "", is_active: true };

const GestionnaireEntreprisesDashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "price" | "shares">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data, isLoading } = useQuery({
    queryKey: ["gest-entreprises", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [companiesRes, sharesRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("user_shares").select("company_id, quantity, user_id"),
      ]);
      const companies = companiesRes.data || [];
      const shares = sharesRes.data || [];
      const enriched = companies.map(c => {
        const cShares = shares.filter(s => s.company_id === c.id);
        return { ...c, totalSold: c.total_shares - c.available_shares, investors: new Set(cShares.map(s => s.user_id)).size };
      });
      const sectorData = Array.from(new Set(companies.map(c => c.sector))).map(sector => ({
        sector: sector.slice(0, 15), count: companies.filter(c => c.sector === sector).length,
        value: companies.filter(c => c.sector === sector).reduce((s, c) => s + Number(c.price_per_share) * (c.total_shares - c.available_shares), 0),
      })).sort((a, b) => b.value - a.value).slice(0, 8);
      return { companies: enriched, sectorData, stats: { total: companies.length, active: companies.filter(c => c.is_active).length, totalCapital: enriched.reduce((s, c) => s + Number(c.price_per_share) * c.totalSold, 0), totalInvestors: new Set(shares.map(s => s.user_id)).size } };
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const p = { ...form, total_shares: Number(form.total_shares), available_shares: Number(form.available_shares), price_per_share: Number(form.price_per_share), previous_price: Number(form.previous_price || form.price_per_share) };
      if (!p.name || !p.registre_commerce || !p.country || !p.city) throw new Error("Champs obligatoires manquants.");
      if (editId) { const { error } = await supabase.from("companies").update(p).eq("id", editId); if (error) throw error; return "Mise à jour effectuée."; }
      const { error } = await supabase.from("companies").insert({ ...p, created_by: user?.id }); if (error) throw error; return "Entreprise créée.";
    },
    onSuccess: async (msg) => { toast.success(msg); setDialogOpen(false); setEditId(null); setForm(emptyForm); await queryClient.invalidateQueries({ queryKey: ["gest-entreprises"] }); await queryClient.invalidateQueries({ queryKey: ["companies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => { const { error } = await supabase.from("companies").update({ is_active: v }).eq("id", id); if (error) throw error; },
    onSuccess: async () => { toast.success("Statut mis à jour."); await queryClient.invalidateQueries({ queryKey: ["gest-entreprises"] }); await queryClient.invalidateQueries({ queryKey: ["companies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (data?.companies || [])
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const m = sortDir === "asc" ? 1 : -1;
      if (sortBy === "price") return (Number(a.price_per_share) - Number(b.price_per_share)) * m;
      if (sortBy === "shares") return (a.totalSold - b.totalSold) * m;
      return a.name.localeCompare(b.name) * m;
    });

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></div>;

  const s = data?.stats;
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b border-blue-500/10 mb-6">
          <div className="container mx-auto px-4 py-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><Building2 className="h-6 w-6 text-blue-400" /></div>
              <div><h1 className="font-heading font-bold text-2xl text-foreground">Gestion des Entreprises</h1><p className="text-sm text-blue-400/80">{profile?.first_name} {profile?.last_name}</p></div>
            </div>
            <Button variant="gold" onClick={() => { setEditId(null); setForm(emptyForm); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Nouvelle entreprise
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total entreprises", value: s?.total || 0, sub: `${s?.active || 0} actives`, icon: Building2, color: "text-blue-400 bg-blue-500/10" },
              { label: "Capital levé", value: fmtShort(s?.totalCapital || 0) + " FCFA", sub: "Valeur des titres vendus", icon: TrendingUp, color: "text-emerald-400 bg-emerald-500/10" },
              { label: "Investisseurs", value: s?.totalInvestors || 0, sub: "Membres actifs", icon: Users, color: "text-amber-400 bg-amber-500/10" },
              { label: "Secteurs couverts", value: new Set((data?.companies || []).map(c => c.sector)).size, sub: "Diversification", icon: Globe, color: "text-purple-400 bg-purple-500/10" },
            ].map((kpi, i) => (
              <div key={i} className="glass-card p-5 hover:border-blue-500/20 transition-all">
                <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center mb-3`}><kpi.icon className="h-5 w-5" /></div>
                <p className="font-heading font-bold text-xl text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/60">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-6">
            <h3 className="font-heading font-semibold text-foreground mb-1">Capital par secteur</h3>
            <p className="text-xs text-muted-foreground mb-4">Valeur des participations vendues</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.sectorData || []} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={90} />
                <Tooltip formatter={(v: any) => fmtCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-heading font-semibold text-foreground">Catalogue ({filtered.length})</h2>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Rechercher..." className="pl-9 h-8 text-xs w-52" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="name">Nom</SelectItem><SelectItem value="price">Prix</SelectItem><SelectItem value="shares">Ventes</SelectItem></SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
                  {sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs">Entreprise</TableHead>
                  <TableHead className="text-xs">Secteur</TableHead>
                  <TableHead className="text-xs">Prix</TableHead>
                  <TableHead className="text-xs">Évolution</TableHead>
                  <TableHead className="text-xs">Vendus / Total</TableHead>
                  <TableHead className="text-xs">Investisseurs</TableHead>
                  <TableHead className="text-xs">Capital levé</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const priceChange = Number(c.price_per_share) - Number(c.previous_price);
                    const pricePct = Number(c.previous_price) > 0 ? (priceChange / Number(c.previous_price) * 100).toFixed(1) : "0";
                    const pct = c.total_shares > 0 ? (c.totalSold / c.total_shares) * 100 : 0;
                    return (
                      <TableRow key={c.id} className="border-border/30 hover:bg-secondary/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {c.logo_url ? <img src={c.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="h-4 w-4 text-primary" />}
                            </div>
                            <div><p className="text-xs font-medium text-foreground">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.city}, {c.country}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{c.sector}</span></TableCell>
                        <TableCell className="font-heading font-bold text-amber-400 text-sm">{Number(c.price_per_share).toLocaleString()} F</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-xs font-medium ${priceChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {priceChange >= 0 ? "+" : ""}{pricePct}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-20">
                            <p className="text-xs text-foreground mb-1">{c.totalSold}/{c.total_shares}</p>
                            <div className="h-1 bg-secondary rounded-full"><div className="h-full bg-gradient-gold rounded-full" style={{ width: `${pct}%` }} /></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground">{c.investors}</TableCell>
                        <TableCell className="text-xs font-bold text-foreground">{fmtShort(Number(c.price_per_share) * c.totalSold)} FCFA</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-secondary text-muted-foreground border-border"}`}>
                            {c.is_active ? "Actif" : "Masqué"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Link to={`/entreprises/${c.id}`}><Button variant="outline" size="sm" className="h-7 text-xs px-2"><Eye className="h-3 w-3" /></Button></Link>
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                              onClick={() => { setEditId(c.id); setForm({ name: c.name, registre_commerce: c.registre_commerce, country: c.country, city: c.city, location: c.location, sector: isActivitySector(c.sector) ? c.sector : ACTIVITY_SECTORS[0], description: c.description, total_shares: c.total_shares, available_shares: c.available_shares, price_per_share: Number(c.price_per_share), previous_price: Number(c.previous_price), logo_url: c.logo_url || "", video_url: c.video_url || "", is_active: c.is_active }); setDialogOpen(true); }}>
                              <Edit className="h-3 w-3 mr-1" />Modifier
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" onClick={() => toggleMutation.mutate({ id: c.id, v: !c.is_active })} disabled={toggleMutation.isPending}>
                              {c.is_active ? "Masquer" : "Publier"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier l'entreprise" : "Nouvelle entreprise"}</DialogTitle>
            <DialogDescription>Renseignez les informations de la société partenaire.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Input placeholder="Nom *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <Input placeholder="Registre de commerce *" value={form.registre_commerce} onChange={e => setForm(p => ({ ...p, registre_commerce: e.target.value }))} />
            <Select value={form.sector} onValueChange={v => setForm(p => ({ ...p, sector: isActivitySector(v) ? v : ACTIVITY_SECTORS[0] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIVITY_SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Pays *" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
            <Input placeholder="Ville *" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            <div className="col-span-2"><Input placeholder="Localisation" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div className="col-span-2"><Textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <Input type="number" placeholder="Total titres" value={form.total_shares} onChange={e => setForm(p => ({ ...p, total_shares: Number(e.target.value) }))} />
            <Input type="number" placeholder="Titres disponibles" value={form.available_shares} onChange={e => setForm(p => ({ ...p, available_shares: Number(e.target.value) }))} />
            <Input type="number" placeholder="Prix actuel (FCFA)" value={form.price_per_share} onChange={e => setForm(p => ({ ...p, price_per_share: Number(e.target.value) }))} />
            <Input type="number" placeholder="Prix précédent" value={form.previous_price} onChange={e => setForm(p => ({ ...p, previous_price: Number(e.target.value) }))} />
            <div className="col-span-2"><ImageUpload value={form.logo_url} onChange={url => setForm(p => ({ ...p, logo_url: url }))} folder="logos" label="Logo" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button variant="gold" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editId ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestionnaireEntreprisesDashboard;
