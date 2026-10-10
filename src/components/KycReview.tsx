import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Doc = { id: string; user_id: string; doc_type: string; file_path: string; phone: string | null; created_at: string };

const KycReview = () => {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ["kyc-pending"],
    queryFn: async () => {
      const { data: docs, error } = await supabase.from("kyc_documents").select("*").eq("status", "pending").order("created_at");
      if (error) throw error;
      const ids = [...new Set((docs || []).map((d) => d.user_id))];
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("user_id, first_name, last_name, msn_id, phone").in("user_id", ids);
      return ids.map((id) => ({ profile: profs?.find((p) => p.user_id === id), docs: (docs || []).filter((d) => d.user_id === id) as Doc[] }));
    },
  });

  const open = async (path: string) => {
    const { data: s, error } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 120);
    if (error) return toast.error(error.message);
    window.open(s.signedUrl, "_blank");
  };

  const review = async (userId: string, approve: boolean) => {
    const { error } = await supabase.rpc("admin_review_kyc", { _user_id: userId, _approve: approve, _note: notes[userId] || null });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Identité validée" : "Dossier refusé");
    qc.invalidateQueries({ queryKey: ["kyc-pending"] });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!data.length) return <p className="text-sm text-muted-foreground">Aucun dossier d'identité en attente.</p>;

  return (
    <div className="space-y-3">
      {data.map(({ profile, docs }) => {
        const uid = docs[0].user_id;
        return (
          <div key={uid} className="glass-card p-4 space-y-3">
            <div>
              <p className="font-semibold text-foreground">{profile?.first_name} {profile?.last_name} <span className="font-mono text-xs text-primary">{profile?.msn_id}</span></p>
              <p className="text-xs text-muted-foreground">Téléphone déclaré : {docs[0].phone || profile?.phone || "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {docs.map((d) => (
                <Button key={d.id} size="sm" variant="outline" onClick={() => open(d.file_path)}>Voir {d.doc_type}</Button>
              ))}
            </div>
            <Input placeholder="Note (motif en cas de refus)" value={notes[uid] || ""} onChange={(e) => setNotes((n) => ({ ...n, [uid]: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" variant="gold" onClick={() => review(uid, true)}>Valider</Button>
              <Button size="sm" variant="destructive" onClick={() => review(uid, false)}>Refuser</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KycReview;
