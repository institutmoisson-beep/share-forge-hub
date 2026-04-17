import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Loader2, Image as ImageIcon, Star, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadCompanyImage } from "@/lib/image-utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type MediaType = "logo" | "banner" | "photo" | "video";

interface CompanyMediaManagerProps {
  companyId: string;
}

const MEDIA_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "banner", label: "Bannière" },
  { value: "logo", label: "Logo" },
  { value: "video", label: "Vidéo (URL)" },
];

const CompanyMediaManager = ({ companyId }: CompanyMediaManagerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<MediaType>("photo");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["company-media", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_media")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: { media_url: string; media_type: MediaType; caption: string }) => {
      const { error } = await supabase.from("company_media").insert({
        company_id: companyId,
        media_url: payload.media_url,
        media_type: payload.media_type,
        caption: payload.caption,
        display_order: media.length,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Média ajouté.");
      setCaption("");
      setVideoUrl("");
      queryClient.invalidateQueries({ queryKey: ["company-media", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Média supprimé.");
      queryClient.invalidateQueries({ queryKey: ["company-media", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Fichier > 8 Mo. Choisissez une image plus légère.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont supportées (utilisez l'URL pour les vidéos).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCompanyImage(supabase, file, uploadType + "s");
      await addMutation.mutateAsync({ media_url: url, media_type: uploadType, caption });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleAddVideo = () => {
    if (!videoUrl.trim()) {
      toast.error("Saisissez une URL de vidéo.");
      return;
    }
    addMutation.mutate({ media_url: videoUrl.trim(), media_type: "video", caption });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <p className="text-sm font-mono text-amber-400">📸 Galerie de l'entreprise</p>

        <div className="flex gap-2 flex-wrap">
          {MEDIA_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setUploadType(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                uploadType === opt.value
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "border-white/10 text-white/50 hover:text-white/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Légende (optionnelle)"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-amber-500/30"
        />

        {uploadType === "video" ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-amber-500/30"
            />
            <button
              type="button"
              onClick={handleAddVideo}
              disabled={addMutation.isPending}
              className="px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-mono hover:bg-amber-500/25 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-mono hover:bg-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Optimisation et upload...</>
            ) : (
              <><Upload className="h-4 w-4" /> Choisir un fichier ({uploadType})</>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <p className="text-[10px] text-white/30 font-mono">
          Images optimisées automatiquement en WebP. Max 8 Mo. Plusieurs photos / bannières possibles.
        </p>
      </div>

      {/* Gallery preview */}
      <div>
        <p className="text-xs font-mono text-white/50 mb-2">
          {isLoading ? "Chargement..." : `${media.length} média(s) en ligne`}
        </p>
        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {media.map((m) => (
              <div
                key={m.id}
                className="relative group rounded-lg overflow-hidden border border-white/10 aspect-square bg-white/5"
              >
                {m.media_type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/40">
                    <Film className="h-6 w-6 text-amber-400/70" />
                  </div>
                ) : (
                  <img src={m.media_url} alt={m.caption || ""} className="w-full h-full object-cover" loading="lazy" />
                )}
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-amber-400 uppercase">
                  {m.media_type === "logo" && <Star className="h-2.5 w-2.5 inline mr-0.5" />}
                  {m.media_type}
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(m.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {media.length === 0 && !isLoading && (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
            <ImageIcon className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30 font-mono">Aucun média. Ajoutez photos, bannières et vidéos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyMediaManager;
