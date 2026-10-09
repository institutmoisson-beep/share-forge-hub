import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Snowflake } from "lucide-react";
import Navbar from "@/components/Navbar";
import RegistryDisclaimer from "@/components/RegistryDisclaimer";
import { supabase } from "@/integrations/supabase/client";

type Result = { found: boolean; status?: string; public_code?: string; company?: string; quantity?: number; version?: number; issued_at?: string; superseded_at?: string; sales_count?: number; holder?: string };

const Verify = () => {
  const { token = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["verify", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_certificate", { _token: token });
      if (error) throw error;
      return data as unknown as Result;
    },
  });

  const status = !data?.found ? "unknown" : data.status;
  const view = {
    valid: { icon: CheckCircle2, label: "Titre valide", cls: "text-success" },
    superseded: { icon: XCircle, label: "Titre cédé — invalide", cls: "text-destructive" },
    frozen: { icon: Snowflake, label: "Titre gelé", cls: "text-primary" },
    unknown: { icon: XCircle, label: "Certificat introuvable", cls: "text-destructive" },
  }[status as string] ?? { icon: XCircle, label: "Inconnu", cls: "text-destructive" };
  const Icon = view.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container mx-auto px-4 max-w-lg">
        <div className="glass-card p-8 text-center">
          {isLoading ? <p className="text-muted-foreground">Vérification…</p> : (
            <>
              <Icon className={`h-16 w-16 mx-auto mb-3 ${view.cls}`} />
              <h1 className={`font-heading text-2xl font-bold mb-6 ${view.cls}`}>{view.label}</h1>
              {data?.found && (
                <dl className="text-left text-sm space-y-2">
                  <Row k="Code" v={data.public_code} />
                  <Row k="Émetteur" v={data.company} />
                  <Row k="Quantité" v={`${data.quantity} titre(s)`} />
                  <Row k="Détenteur" v={data.holder ?? "—"} />
                  <Row k="Émis le" v={data.issued_at && new Date(data.issued_at).toLocaleString("fr")} />
                  {data.superseded_at && <Row k="Cédé le" v={new Date(data.superseded_at).toLocaleString("fr")} />}
                  <Row k="Cessions enregistrées (émetteur)" v={String(data.sales_count)} />
                </dl>
              )}
            </>
          )}
        </div>
        <RegistryDisclaimer />
      </div>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v?: string }) => (
  <div className="flex justify-between gap-4 border-b border-border pb-1"><dt className="text-muted-foreground">{k}</dt><dd className="text-foreground font-medium">{v}</dd></div>
);

export default Verify;
