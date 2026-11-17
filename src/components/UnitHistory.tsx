import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TYPE: Record<string, string> = { issuance: "Émission", market: "Marché", otc: "Gré à gré", direct: "Cession directe" };

/** Ownership and price history of one numbered title. */
const UnitHistory = ({ unitId }: { unitId: string }) => {
  const { data = [], isLoading } = useQuery({
    queryKey: ["unit-history", unitId],
    queryFn: async () => { const { data, error } = await supabase.rpc("get_unit_history", { _unit: unitId }); if (error) throw error; return data || []; },
  });
  if (isLoading) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  const prices = data.map((h) => Number(h.price_fcfa));
  const first = prices[0] ?? 0, last = prices[prices.length - 1] ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2"><p className="text-muted-foreground">Propriétaires</p><p className="font-semibold text-foreground">{data.length}</p></div>
        <div className="rounded-lg bg-muted/40 p-2"><p className="text-muted-foreground">Dernier prix</p><p className="font-semibold text-foreground">{last.toLocaleString("fr")} FCFA</p></div>
        <div className="rounded-lg bg-muted/40 p-2"><p className="text-muted-foreground">Évolution</p><p className={`font-semibold ${change >= 0 ? "text-success" : "text-destructive"}`}>{change >= 0 ? "+" : ""}{change.toFixed(1)} %</p></div>
      </div>
      <ol className="space-y-1 text-xs">
        {data.map((h, i) => (
          <li key={i} className="flex justify-between gap-2 border-b border-border py-1">
            <span className="text-foreground">{TYPE[h.transfer_type] || h.transfer_type} · {h.from_label} → {h.to_label}</span>
            <span className="text-muted-foreground whitespace-nowrap">{Number(h.price_fcfa).toLocaleString("fr")} FCFA · {new Date(h.created_at).toLocaleDateString("fr")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};
export default UnitHistory;
