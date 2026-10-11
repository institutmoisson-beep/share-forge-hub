import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Snowflake, Gauge, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACTIONS: Record<string, string> = {
  certificate_issued: "Certificat émis", certificate_superseded: "Certificat annulé", risk_accepted: "Risque accepté",
  kyc_approved: "KYC validé", kyc_rejected: "KYC refusé", frozen: "Gel", unfrozen: "Dégel", limits_updated: "Plafonds modifiés",
  issuer_member_added: "Accès émetteur ajouté", issuer_member_removed: "Accès émetteur retiré",
  issuer_approved_listing: "Cession autorisée", issuer_rejected_listing: "Cession refusée", issuer_rules_updated: "Règles émetteur",
};

const AdminControls = () => {
  const qc = useQueryClient();
  const [maxTx, setMaxTx] = useState("");
  const [max30, setMax30] = useState("");
  const [search, setSearch] = useState("");
  const [certCode, setCertCode] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => (await supabase.from("platform_settings").select("*").eq("id", 1).single()).data,
  });
  useEffect(() => { if (settings) { setMaxTx(String(settings.max_tx_amount)); setMax30(String(settings.max_30d_amount)); } }, [settings]);

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-ctrl-companies"],
    queryFn: async () => (await supabase.from("companies").select("id, name, is_frozen").order("name")).data || [],
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-ctrl-users", search],
    queryFn: async () => {
      let q = supabase.from("profiles").select("user_id, msn_id, first_name, last_name, is_frozen, kyc_status").order("created_at", { ascending: false }).limit(30);
      const s = search.trim().replace(/[,%()]/g, "");
      if (s) q = q.or(`msn_id.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
      return (await q).data || [];
    },
  });
  const { data: chains = {} } = useQuery({
    queryKey: ["admin-chains", companies.map((c) => c.id).join()],
    enabled: companies.length > 0,
    queryFn: async () => {
      const out: Record<string, { valid: boolean; records: number }> = {};
      await Promise.all(companies.map(async (c) => { out[c.id] = (await supabase.rpc("verify_chain", { _company_id: c.id })).data as never; }));
      return out;
    },
  });
  const { data: log = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => { const { data, error } = await supabase.rpc("admin_audit_log", { _limit: 200 }); if (error) throw error; return data || []; },
  });

  const saveLimits = async () => {
    const { error } = await supabase.rpc("admin_update_limits", { _max_tx: Number(maxTx), _max_30d: Number(max30) });
    if (error) return toast.error(error.message);
    toast.success("Plafonds enregistrés");
    qc.invalidateQueries({ queryKey: ["platform-settings"] });
    qc.invalidateQueries({ queryKey: ["admin-audit"] });
  };

  const freeze = async (entity: "user" | "company" | "certificate", id: string, frozen: boolean) => {
    const reason = window.prompt(frozen ? "Motif du gel ?" : "Motif du dégel ?") ?? "";
    const { error } = await supabase.rpc("admin_set_frozen", { _entity: entity, _id: id, _frozen: frozen, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success(frozen ? "Gelé" : "Dégelé");
    qc.invalidateQueries({ queryKey: ["admin-ctrl-users"] });
    qc.invalidateQueries({ queryKey: ["admin-ctrl-companies"] });
    qc.invalidateQueries({ queryKey: ["admin-audit"] });
  };

  const freezeCert = async (frozen: boolean) => {
    const { data } = await supabase.from("certificates").select("id, status").eq("public_code", certCode.trim().toUpperCase()).maybeSingle();
    if (!data) return toast.error("Certificat introuvable");
    if (data.status === "superseded") return toast.error("Ce certificat est déjà annulé");
    await freeze("certificate", data.id, frozen);
    setCertCode("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass-card p-5 space-y-3">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" />Plafonds d'achat (FCFA)</h3>
        <label className="text-xs text-muted-foreground block">Maximum par opération<Input type="number" value={maxTx} onChange={(e) => setMaxTx(e.target.value)} /></label>
        <label className="text-xs text-muted-foreground block">Maximum par membre sur 30 jours<Input type="number" value={max30} onChange={(e) => setMax30(e.target.value)} /></label>
        <Button variant="gold" onClick={saveLimits}>Enregistrer</Button>
      </section>

      <section className="glass-card p-5 space-y-3">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Émetteurs : gel et historique</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {companies.map((c) => {
            const ch = chains[c.id];
            return (
              <div key={c.id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2">
                <div>
                  <p className="text-foreground">{c.name} {c.is_frozen && <span className="text-xs text-primary">· gelé</span>}</p>
                  <p className={`text-xs ${ch?.valid === false ? "text-destructive" : "text-muted-foreground"}`}>{ch ? (ch.valid ? `Historique intact (${ch.records})` : "Anomalie dans l'historique !") : "…"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => freeze("company", c.id, !c.is_frozen)}>{c.is_frozen ? "Dégeler" : "Geler"}</Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-card p-5 space-y-3">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><Snowflake className="h-5 w-5 text-primary" />Membres : gel du compte</h3>
        <Input placeholder="Rechercher (nom ou MSN-HC-…)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2">
              <p className="text-foreground">{u.first_name} {u.last_name} <span className="font-mono text-xs text-primary">{u.msn_id}</span>
                <span className="text-xs text-muted-foreground"> · KYC {u.kyc_status}{u.is_frozen ? " · gelé" : ""}</span></p>
              <Button size="sm" variant="outline" onClick={() => freeze("user", u.user_id, !u.is_frozen)}>{u.is_frozen ? "Dégeler" : "Geler"}</Button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Geler un certificat précis</p>
          <div className="flex gap-2">
            <Input placeholder="MSN-XXXX-XXXX" value={certCode} onChange={(e) => setCertCode(e.target.value)} />
            <Button size="sm" variant="outline" disabled={!certCode} onClick={() => freezeCert(true)}>Geler</Button>
            <Button size="sm" variant="outline" disabled={!certCode} onClick={() => freezeCert(false)}>Dégeler</Button>
          </div>
        </div>
      </section>

      <section className="glass-card p-5 space-y-3">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><History className="h-5 w-5 text-primary" />Journal d'activité</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto text-xs">
          {log.length === 0 ? <p className="text-muted-foreground">Aucune activité.</p> : log.map((l, i) => (
            <div key={i} className="flex justify-between gap-2 border-b border-border py-1">
              <span className="text-foreground">{ACTIONS[l.action] || l.action} <span className="text-muted-foreground">· {l.entity}</span>
                {(l.details as { reason?: string })?.reason ? <span className="text-muted-foreground"> · {(l.details as { reason?: string }).reason}</span> : null}</span>
              <span className="text-muted-foreground whitespace-nowrap">{l.actor} · {new Date(l.created_at).toLocaleString("fr")}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminControls;
