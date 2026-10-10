import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ComplianceCard = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [docType, setDocType] = useState("cni");
  const [file, setFile] = useState<File | null>(null);
  const [phone, setPhone] = useState(profile?.phone || "");
  const [busy, setBusy] = useState(false);
  const [riskChecked, setRiskChecked] = useState(false);

  if (!user || !profile) return null;
  const kyc = profile.kyc_status as string;
  const kycDone = kyc === "approved";
  const riskDone = !!profile.risk_ack_at;
  if (kycDone && riskDone && !profile.is_frozen) return null;

  const submit = async () => {
    if (!file) return toast.error("Choisissez une photo ou un PDF de votre pièce d'identité");
    if (!/^\+?[0-9 ]{8,15}$/.test(phone.trim())) return toast.error("Numéro de téléphone invalide");
    if (file.size > 10 * 1024 * 1024) return toast.error("Fichier trop lourd (10 Mo max)");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}-${docType}.${ext}`;
      const up = await supabase.storage.from("kyc-documents").upload(path, file);
      if (up.error) throw up.error;
      const ins = await supabase.from("kyc_documents").insert({ user_id: user.id, doc_type: docType, file_path: path, phone: phone.trim() });
      if (ins.error) throw ins.error;
      const rpc = await supabase.rpc("submit_kyc");
      if (rpc.error) throw rpc.error;
      toast.success("Dossier envoyé. Un administrateur va le vérifier.");
      setFile(null);
      await refreshProfile();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const acceptRisk = async () => {
    const { error } = await supabase.rpc("accept_risk_warning");
    if (error) return toast.error(error.message);
    toast.success("Avertissement accepté");
    await refreshProfile();
  };

  return (
    <section className="container mx-auto px-4 pt-20 -mb-14 relative z-10">
      <div className="glass-card p-5 space-y-5 border border-primary/30">
        {profile.is_frozen && (
          <p className="flex items-center gap-2 text-destructive text-sm"><ShieldAlert className="h-4 w-4" />Votre compte est gelé : achats et ventes suspendus. Contactez l'administration.</p>
        )}

        {!kycDone && (
          <div className="space-y-3">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
              {kyc === "rejected" ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-primary" />}
              Vérification d'identité obligatoire
            </h2>
            <p className="text-sm text-muted-foreground">
              Avant tout achat ou vente de titres, envoyez une pièce d'identité et votre numéro de téléphone.
              {kyc === "rejected" && <span className="block text-destructive mt-1">Dossier refusé{profile.kyc_note ? ` : ${profile.kyc_note}` : ""}. Vous pouvez en renvoyer un.</span>}
            </p>
            <div className="grid gap-2 md:grid-cols-4">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cni">Carte d'identité</SelectItem>
                  <SelectItem value="passeport">Passeport</SelectItem>
                  <SelectItem value="permis">Permis de conduire</SelectItem>
                  <SelectItem value="selfie">Selfie avec la pièce</SelectItem>
                </SelectContent>
              </Select>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Input placeholder="+225 07 00 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button variant="gold" onClick={submit} disabled={busy}>{busy ? "Envoi…" : "Envoyer le dossier"}</Button>
            </div>
          </div>
        )}
        {kycDone && <p className="flex items-center gap-2 text-success text-sm"><ShieldCheck className="h-4 w-4" />Identité vérifiée</p>}

        {!riskDone && (
          <div className="space-y-3 border-t border-border pt-4">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />Avertissement sur les risques</h2>
            <p className="text-sm text-muted-foreground">
              Les titres de sociétés non cotées, en particulier d'entreprises en difficulté, comportent un risque de perte totale du capital engagé.
              Aucun rendement ni gain n'est garanti. Ces titres peuvent être difficiles à revendre. Ne participez qu'avec des sommes que vous pouvez vous permettre de perdre.
            </p>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <Checkbox checked={riskChecked} onCheckedChange={(v) => setRiskChecked(!!v)} />
              J'ai lu et je comprends ces risques, y compris le risque de perte totale.
            </label>
            <Button variant="gold" disabled={!riskChecked} onClick={acceptRisk}>J'accepte</Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ComplianceCard;
