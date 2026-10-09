import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Cert = { id: string; public_code: string; quantity: number; status: string; version: number; issued_at: string; companies: { name: string } | null };

const MyCertificates = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState<Cert | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const { data: certs = [] } = useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, public_code, quantity, status, version, issued_at, companies(name)")
        .eq("current_owner_id", user!.id)
        .neq("status", "superseded")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Cert[];
    },
  });

  const show = async (c: Cert) => {
    setOpen(c);
    setToken(null);
    const { data } = await supabase.rpc("get_my_certificate_token", { _cert_id: c.id });
    setToken(data as string | null);
  };

  const url = token ? `${window.location.origin}/verify/${token}` : "";

  return (
    <section className="container mx-auto px-4 py-8">
      <h2 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" /> Mes certificats de titres
      </h2>
      {certs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun certificat actif.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => (
            <div key={c.id} className="glass-card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{c.companies?.name}</p>
                <p className="font-mono text-xs text-primary">{c.public_code}</p>
                <p className="text-xs text-muted-foreground">{c.quantity} titre(s) · v{c.version} · {new Date(c.issued_at).toLocaleDateString("fr")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => show(c)}><QrCode className="h-4 w-4 mr-1" />QR</Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certificat {open?.public_code}</DialogTitle>
            <DialogDescription>{open?.companies?.name} · {open?.quantity} titre(s). Ce QR devient invalide dès la cession du titre.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {token ? (
              <>
                <div className="bg-card p-3 rounded-xl"><QRCodeSVG value={url} size={200} /></div>
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">Ouvrir la page de vérification</a>
              </>
            ) : <p className="text-sm text-muted-foreground">Chargement…</p>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MyCertificates;
