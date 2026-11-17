import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invokePlatformAction } from "@/lib/platform-actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UnitHistory from "@/components/UnitHistory";

type Mode = "market" | "otc" | "direct";
const MODES: { v: Mode; label: string; help: string }[] = [
  { v: "market", label: "Annonce publique", help: "Visible par tous les membres, payée avec le portefeuille." },
  { v: "otc", label: "Gré à gré", help: "Réservée à un membre précis, qui paie avec son portefeuille." },
  { v: "direct", label: "Cession directe", help: "Le paiement se fait hors de l'application. Le destinataire confirme la réception des titres." },
];

/** Seller chooses which numbered titles to sell and how. */
const SellUnitsDialog = ({ open, onOpenChange, initialShareId }: { open: boolean; onOpenChange: (o: boolean) => void; initialShareId?: string | null }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [shareId, setShareId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("market");
  const [price, setPrice] = useState("");
  const [target, setTarget] = useState("");
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: units = [] } = useQuery({
    queryKey: ["my-units", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("share_units").select("id, unit_code, serial, last_price, user_share_id, company_id, companies(name, price_per_share)").eq("current_owner_id", user!.id).order("serial");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: listed = [] } = useQuery({
    queryKey: ["my-listed-units", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase.from("listing_units").select("unit_id, p2p_listings!inner(status, seller_id)").eq("sold", false).eq("p2p_listings.status", "active").eq("p2p_listings.seller_id", user!.id);
      return (data || []).map((r) => r.unit_id);
    },
  });

  const holdings = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number; price: number }>();
    units.forEach((u) => {
      const k = u.user_share_id || "";
      const c = u.companies as { name: string; price_per_share: number } | null;
      const e = m.get(k) || { id: k, name: c?.name || "Entreprise", count: 0, price: Number(c?.price_per_share || u.last_price) };
      e.count++; m.set(k, e);
    });
    return [...m.values()];
  }, [units]);

  useEffect(() => {
    if (!open) return;
    const first = initialShareId && holdings.some((h) => h.id === initialShareId) ? initialShareId : holdings[0]?.id || "";
    setShareId((s) => s || first);
  }, [open, holdings, initialShareId]);
  useEffect(() => { setPicked([]); const h = holdings.find((x) => x.id === shareId); if (h) setPrice(String(h.price)); }, [shareId]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineUnits = units.filter((u) => u.user_share_id === shareId);
  const available = lineUnits.filter((u) => !listed.includes(u.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    setBusy(true);
    try {
      await invokePlatformAction("create_listing", { unitIds: picked, pricePerShare: Number(price), paymentMode: mode === "direct" ? "external" : "wallet", targetMsn: mode === "market" ? "" : target });
      toast.success(mode === "market" ? "Annonce publiée." : "Offre envoyée au destinataire.");
      ["p2p-listings", "my-active-listings", "my-listed-units", "user_shares"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setPicked([]); setTarget(""); onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Céder des titres</DialogTitle>
          <DialogDescription>Cochez les numéros des titres à céder, puis choisissez le mode.</DialogDescription>
        </DialogHeader>
        {holdings.length === 0 ? <p className="text-sm text-muted-foreground">Vous ne détenez aucun titre.</p> : (
          <div className="space-y-3">
            <Select value={shareId} onValueChange={setShareId}>
              <SelectTrigger><SelectValue placeholder="Ligne de titres" /></SelectTrigger>
              <SelectContent>{holdings.map((h) => <SelectItem key={h.id} value={h.id}>{h.name} · {h.count} titre(s)</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex justify-between text-xs">
              <button className="text-primary underline" onClick={() => setPicked(picked.length === available.length ? [] : available.map((u) => u.id))}>
                {picked.length === available.length && available.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
              <span className="text-muted-foreground">{picked.length} / {available.length} disponible(s)</span>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {lineUnits.map((u) => {
                const isListed = listed.includes(u.id);
                return (
                  <div key={u.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-center gap-3">
                      <Checkbox disabled={isListed} checked={picked.includes(u.id)} onCheckedChange={() => toggle(u.id)} aria-label={`Choisir ${u.unit_code}`} />
                      <span className="font-mono text-sm text-foreground flex-1">{u.unit_code}{isListed && <span className="text-xs text-muted-foreground"> · déjà proposé</span>}</span>
                      <Button size="sm" variant="ghost" onClick={() => setHistoryOf(historyOf === u.id ? null : u.id)}><History className="h-4 w-4" /></Button>
                    </div>
                    {historyOf === u.id && <div className="mt-2"><UnitHistory unitId={u.id} /></div>}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button key={m.v} onClick={() => setMode(m.v)} className={`rounded-lg border p-2 text-xs ${mode === m.v ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>{m.label}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{MODES.find((m) => m.v === mode)?.help}</p>
            {mode !== "market" && <Input placeholder="Identifiant du destinataire (MSN-HC-…)" value={target} onChange={(e) => setTarget(e.target.value)} />}
            <label className="text-xs text-muted-foreground block">{mode === "direct" ? "Prix convenu par titre (FCFA), pour l'historique" : "Prix par titre (FCFA)"}
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <p className="text-sm text-foreground">Total : <span className="font-bold text-primary">{(picked.length * Number(price || 0)).toLocaleString("fr")} FCFA</span></p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="gold" disabled={busy || picked.length === 0 || (mode !== "market" && !target.trim())} onClick={submit}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{mode === "market" ? "Publier" : "Envoyer l'offre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default SellUnitsDialog;
