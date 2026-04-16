import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadCompanyImage } from "@/lib/image-utils";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  maxSizeMB?: number;
}

const ImageUpload = ({ value, onChange, folder = "logos", label = "Logo", maxSizeMB = 5 }: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${maxSizeMB} Mo.`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadCompanyImage(supabase, file, folder);
      onChange(url);
      toast.success("Image téléchargée avec succès !");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary">
            <img src={value} alt={label} className="w-full h-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/50">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Optimisation...
              </>
            ) : (
              "Choisir un fichier"
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP • Max {maxSizeMB} Mo</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
};

export default ImageUpload;
