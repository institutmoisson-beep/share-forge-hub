import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Snowflake, Search, ScanLine } from "lucide-react";
import Navbar from "@/components/Navbar";
import RegistryDisclaimer from "@/components/RegistryDisclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type R = { found: boolean; unit_code?: string; serial?: number; company?: string; status?: string; last_price?: number; issued_at?: string; holder?: string; history?: { at: string; type: string; price: number }[] };

const VerifyTitle = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code") ?? "";
  const [input, setInput] = useState(code);
  const { data, isFetching } = useQuery({
    queryKey: ["verify-unit", code], enabled: !!code,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_unit", { _code: code });
      if (error) throw error;
      return data as unknown as R;
    },
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    // Lien de certificat QR collé → page de vérification certificat
    const m = v.match(/verify\/([^/?#\s]+)/);
    if (m) return navigate(`/verify/${m[1]}`);
    setParams({ code: v });
  };
  const view = !data ? null : !data.found
    ? { Icon: XCircle, label: "Titre introuvable", cls: "text-destructive" }
    : data.status === "frozen" ? { Icon: Snowflake, label: "Titre gelé", cls: "text-primary" }
    : { Icon: CheckCircle2, label: "Titre authentique", cls: "text-success" };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-4 max-w-xl">
        <h1 className="font-heading text-3xl font-bold text-gradient-gold mb-2">Vérifier un titre</h1>
        <p className="text-muted-foreground mb-6">Saisissez le numéro d'un titre ou collez le lien du QR code d'un certificat.</p>
        <form onSubmit={submit} className="flex gap-2 mb-6">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Numéro du titre ou lien du QR" aria-label="Numéro du titre" />
          <Button type="submit"><Search className="h-4 w-4 mr-1" />Vérifier</Button>
        </form>
        {isFetching && <p className="text-muted-foreground">Vérification…</p>}
        {view && !isFetching && (
          <div className="glass-card p-6">
            <div className="text-center mb-4">
              <view.Icon className={`h-14 w-14 mx-auto mb-2 ${view.cls}`} />
              <h2 className={`font-heading text-2xl font-bold ${view.cls}`}>{view.label}</h2>
            </div>
            {data?.found && (
              <>
                <dl className="text-sm space-y-2">
                  {[["Numéro", data.unit_code], ["Émetteur", data.company], ["Détenteur actuel", data.holder],
                    ["Dernier prix", `${Number(data.last_price).toLocaleString("fr")} FCFA`],
                    ["Créé le", data.issued_at && new Date(data.issued_at).toLocaleDateString("fr")],
                    ["Cessions", String(data.history?.length ?? 0)]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-border pb-1"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-foreground">{v}</dd></div>
                  ))}
                </dl>
                {!!data.history?.length && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><ScanLine className="h-4 w-4" />Historique</h3>
                    <ul className="text-sm space-y-1">
                      {data.history.map((h, i) => (
                        <li key={i} className="flex justify-between text-muted-foreground">
                          <span>{new Date(h.at).toLocaleDateString("fr")} · {h.type}</span>
                          <span>{Number(h.price).toLocaleString("fr")} FCFA</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <RegistryDisclaimer />
      </div>
    </div>
  );
};
export default VerifyTitle;
