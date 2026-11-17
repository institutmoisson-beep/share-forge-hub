import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invokePlatformAction } from "@/lib/platform-actions";
import { downloadReceiptPdf } from "@/lib/receipt-pdf";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import UnitHistory from "@/components/UnitHistory";

export type BuyListing = { id: string; price_per_share: number; payment_mode?: string; target_buyer_id?: string | null; companyName: string; sellerMsn?: string };

/** Buyer picks the exact title numbers to buy from one listing, then gets the PDF receipt. */
const BuyUnitsDialog = ({ listing, onClose, onDone }: { listing: BuyListing | null; onClose: () => void; onDone?: () => void }) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<string[]>([]);
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPicked([]); setHistoryOf(null); }, [listing?.id]);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["listing-units", listing?.id],
    enabled: !!listing,
    queryFn: async () => { const { data, error } = await supabase.rpc("get_listing_units", { _listing: listing!.id }); if (error) throw error; return data || []; },
  });

  if (!listing) return null;
  const price = Number(listing.price_per_share);
  const external = listing.payment_mode === "external";
  const mode = external ? "direct" : listing.target_buyer_id ? "otc" : "market";
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const buy = async () => {
    setBusy(true);
    try {
      const r = await invokePlatformAction<{ orderNumber: string; unit_codes: string[]; total: number }>("purchase_listing", { listingId: listing.id, unitIds: picked });
      const { data: me } = await supabase.from("profiles").select("first_name, last_name, msn_id, phone").eq("user_id", user!.id).maybeSingle();
      const p = me || profile;
      await downloadReceiptPdf({
        orderNumber: r.orderNumber, company: listing.companyName, unitCodes: r.unit_codes, pricePerUnit: price, total: Number(r.total),
        buyerName: p ? `${p.first_name} ${p.last_name}` : user?.email || "", buyerMsn: p?.msn_id, buyerPhone: p?.phone, mode,
      });
      toast.success(`${r.unit_codes.length} titre(s) acquis. Reçu téléchargé.`);
      ["p2p-listings", "company-p2p", "wallet", "user_shares", "transactions", "my-certificates", "my-units", "offers-for-me"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onDone?.();
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listing.companyName} · choisir les titres</DialogTitle>
          <DialogDescription>
            {listing.sellerMsn ? `Vendeur ${listing.sellerMsn} · ` : ""}{price.toLocaleString("fr")} FCFA par titre
            {external ? " · paiement fait hors de l'application, votre portefeuille n'est pas débité" : " · payé avec votre portefeuille"}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : units.length === 0 ? <p className="text-sm text-muted-foreground">Aucun titre disponible.</p> : (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <button className="text-primary underline" onClick={() => setPicked(picked.length === units.length ? [] : units.map((u) => u.unit_id))}>
                {picked.length === units.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
              <span className="text-muted-foreground">{units.length} titre(s) proposés</span>
            </div>
            {units.map((u) => (
              <div key={u.unit_id} className="rounded-lg border border-border p-2">
                <div className="flex items-center gap-3">
                  <Checkbox checked={picked.includes(u.unit_id)} onCheckedChange={() => toggle(u.unit_id)} aria-label={`Choisir ${u.unit_code}`} />
                  <div className="flex-1">
                    <p className="font-mono text-sm text-foreground">{u.unit_code}</p>
                    <p className="text-xs text-muted-foreground">{Number(u.transfers)} cession(s) · dernier prix {Number(u.last_price).toLocaleString("fr")} FCFA</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setHistoryOf(historyOf === u.unit_id ? null : u.unit_id)}><History className="h-4 w-4 mr-1" />Historique</Button>
                </div>
                {historyOf === u.unit_id && <div className="mt-2"><UnitHistory unitId={u.unit_id} /></div>}
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:items-center">
          <p className="text-sm text-foreground sm:mr-auto">{picked.length} titre(s) · <span className="font-bold text-primary">{(picked.length * price).toLocaleString("fr")} FCFA</span></p>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="gold" disabled={busy || picked.length === 0} onClick={buy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{external ? "Confirmer la réception" : "Acheter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default BuyUnitsDialog;
