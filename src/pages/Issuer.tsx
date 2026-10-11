import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Download, FileText, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import RegistryDisclaimer from "@/components/RegistryDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = { public_code: string; msn_id: string; holder_name: string; phone: string | null; quantity: number; status: string; version: number; issued_at: string };

const Issuer = () => {
  const { user, loading, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [msn, setMsn] = useState("");
  const [rules, setRules] = useState("");
  const [requires, setRequires] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["issuer-companies", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      if (isAdmin) {
        const { data } = await supabase.from("companies").select("id, name, requires_issuer_approval, transfer_rules, total_shares").order("name");
        return data || [];
      }
      const { data: m } = await supabase.from("company_members").select("company_id").eq("user_id", user!.id);
      const ids = (m || []).map((x) => x.company_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("companies").select("id, name, requires_issuer_approval, transfer_rules, total_shares").in("id", ids);
      return data || [];
    },
  });

  useEffect(() => { if (!companyId && companies[0]) setCompanyId(companies[0].id); }, [companies, companyId]);
  const company = companies.find((c) => c.id === companyId);
  useEffect(() => { if (company) { setRules(company.transfer_rules || ""); setRequires(company.requires_issuer_approval); } }, [company]);

  const { data: register = [] } = useQuery({
    queryKey: ["issuer-register", companyId], enabled: !!companyId,
    queryFn: async () => { const { data, error } = await supabase.rpc("get_issuer_register", { _company: companyId }); if (error) throw error; return (data || []) as Row[]; },
  });
  const { data: pending = [] } = useQuery({
    queryKey: ["issuer-pending", companyId], enabled: !!companyId,
    queryFn: async () => { const { data, error } = await supabase.rpc("get_issuer_pending_listings", { _company: companyId }); if (error) throw error; return data || []; },
  });
  const { data: chain } = useQuery({
    queryKey: ["issuer-chain", companyId], enabled: !!companyId,
    queryFn: async () => (await supabase.rpc("verify_chain", { _company_id: companyId })).data as { valid: boolean; records: number } | null,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["issuer-members", companyId], enabled: !!companyId && isAdmin,
    queryFn: async () => (await supabase.rpc("get_company_members", { _company: companyId })).data || [],
  });

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  const review = async (id: string, approve: boolean) => {
    const note = approve ? null : window.prompt("Motif du refus ?") || null;
    const { error } = await supabase.rpc("issuer_review_listing", { _listing: id, _approve: approve, _note: note });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Cession autorisée" : "Cession refusée");
    qc.invalidateQueries({ queryKey: ["issuer-pending", companyId] });
  };

  const saveRules = async () => {
    const { error } = await supabase.rpc("issuer_update_rules", { _company: companyId, _requires: requires, _rules: rules });
    if (error) return toast.error(error.message);
    toast.success("Règles enregistrées");
    qc.invalidateQueries({ queryKey: ["issuer-companies"] });
  };

  const setMember = async (add: boolean, id = msn) => {
    const { error } = await supabase.rpc("admin_set_issuer_member", { _company: companyId, _msn_id: id, _add: add });
    if (error) return toast.error(error.message);
    toast.success(add ? "Accès émetteur accordé" : "Accès retiré");
    setMsn("");
    qc.invalidateQueries({ queryKey: ["issuer-members", companyId] });
  };

  const exportCsv = () => {
    const head = ["Code certificat", "ID MSN", "Détenteur", "Téléphone", "Quantité", "Statut", "Version", "Émis le"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [head, ...register.map((r) => [r.public_code, r.msn_id, r.holder_name, r.phone, r.quantity, r.status, r.version, new Date(r.issued_at).toLocaleString("fr")])].map((l) => l.map(esc).join(";"));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registre-${company?.name || "emetteur"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = register.map((r) => `<tr><td>${r.public_code}</td><td>${r.msn_id ?? ""}</td><td>${r.holder_name ?? ""}</td><td style="text-align:right">${r.quantity}</td><td>${new Date(r.issued_at).toLocaleDateString("fr")}</td></tr>`).join("");
    const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
    w.document.write(`<html><head><title>Registre</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px;font-size:12px}</style></head><body>
      <h1>Registre des détenteurs — ${esc(company?.name || "")}</h1><p>Extrait du ${new Date().toLocaleString("fr")} · ${totalHeld} titres enregistrés sur la plateforme</p>
      <table><thead><tr><th>Certificat</th><th>ID MSN</th><th>Détenteur</th><th>Quantité</th><th>Émis le</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:24px;font-size:11px">Ce registre numérique reflète les cessions enregistrées sur la plateforme ; le registre officiel de l'émetteur et ses statuts font foi.</p>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  const totalHeld = register.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container mx-auto px-4 space-y-6">
        <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3"><Building2 className="h-8 w-8 text-primary" />Espace émetteur</h1>

        {companies.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">Votre compte n'est rattaché à aucune entreprise émettrice. L'administration peut vous donner cet accès.</div>
        ) : (
          <>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Entreprise" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Détenteurs (certificats actifs)</p><p className="text-2xl font-bold text-foreground">{register.length}</p></div>
              <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Titres détenus par les membres</p><p className="text-2xl font-bold text-foreground">{totalHeld.toLocaleString("fr")}</p></div>
              <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Historique des cessions</p>
                <p className={`text-lg font-bold flex items-center gap-2 ${chain?.valid ? "text-success" : "text-destructive"}`}><ShieldCheck className="h-5 w-5" />{chain ? (chain.valid ? `Intact (${chain.records})` : "Anomalie détectée") : "…"}</p></div>
            </div>

            <section className="glass-card p-5 space-y-3">
              <h2 className="font-heading font-bold text-foreground">Cessions en attente de votre accord</h2>
              {pending.length === 0 ? <p className="text-sm text-muted-foreground">Aucune demande.</p> : pending.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
                  <p className="text-sm text-foreground"><span className="font-mono text-primary">{l.seller_msn}</span> · {l.quantity} titre(s) à {Number(l.price_per_share).toLocaleString("fr")} FCFA</p>
                  <div className="flex gap-2"><Button size="sm" variant="gold" onClick={() => review(l.id, true)}>Autoriser</Button><Button size="sm" variant="destructive" onClick={() => review(l.id, false)}>Refuser</Button></div>
                </div>
              ))}
            </section>

            <section className="glass-card p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading font-bold text-foreground">Registre des détenteurs</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportCsv} disabled={!register.length}><Download className="h-4 w-4 mr-1" />CSV</Button>
                  <Button size="sm" variant="outline" onClick={exportPdf} disabled={!register.length}><FileText className="h-4 w-4 mr-1" />PDF</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-xs"><tr><th className="text-left p-2">Certificat</th><th className="text-left p-2">Détenteur</th><th className="text-left p-2">Téléphone</th><th className="text-right p-2">Quantité</th><th className="text-left p-2">Émis le</th></tr></thead>
                  <tbody>{register.map((r) => (
                    <tr key={r.public_code} className="border-t border-border">
                      <td className="p-2 font-mono text-primary">{r.public_code}</td><td className="p-2 text-foreground">{r.holder_name} <span className="text-xs text-muted-foreground">{r.msn_id}</span></td>
                      <td className="p-2 text-muted-foreground">{r.phone || "—"}</td><td className="p-2 text-right text-foreground">{r.quantity}</td><td className="p-2 text-muted-foreground">{new Date(r.issued_at).toLocaleDateString("fr")}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            </section>

            <section className="glass-card p-5 space-y-3">
              <h2 className="font-heading font-bold text-foreground">Règles de cession</h2>
              <label className="flex items-center gap-3 text-sm text-foreground"><Switch checked={requires} onCheckedChange={setRequires} />Chaque revente doit être autorisée par l'émetteur</label>
              <Textarea placeholder="Clauses d'agrément, préemption, restrictions…" value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000} />
              <Button variant="gold" onClick={saveRules}>Enregistrer</Button>
            </section>

            {isAdmin && (
              <section className="glass-card p-5 space-y-3">
                <h2 className="font-heading font-bold text-foreground">Comptes émetteur (admin)</h2>
                <div className="flex gap-2 max-w-md"><Input placeholder="MSN-HC-123456" value={msn} onChange={(e) => setMsn(e.target.value)} /><Button variant="gold" onClick={() => setMember(true)} disabled={!msn}>Ajouter</Button></div>
                {members.map((m) => (
                  <div key={m.msn_id} className="flex items-center justify-between text-sm max-w-md"><span className="text-foreground">{m.first_name} {m.last_name} <span className="font-mono text-xs text-primary">{m.msn_id}</span></span>
                    <Button size="sm" variant="outline" onClick={() => setMember(false, m.msn_id)}>Retirer</Button></div>
                ))}
              </section>
            )}
          </>
        )}
        <RegistryDisclaimer />
      </div>
    </div>
  );
};

export default Issuer;
