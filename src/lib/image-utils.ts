/**
 * Compresses an image file before upload.
 * Returns a new File with reduced size (JPEG/WebP at target quality).
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; format?: "image/webp" | "image/jpeg" } = {},
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8, format = "image/webp" } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if needed
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas non supporté"));

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression échouée"));
          const ext = format === "image/webp" ? ".webp" : ".jpg";
          const name = file.name.replace(/\.[^.]+$/, ext);
          resolve(new File([blob], name, { type: format }));
        },
        format,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image invalide"));
    };

    img.src = url;
  });
}

/**
 * Upload a file to Supabase Storage with automatic compression for images.
 */
export async function uploadCompanyImage(
  supabaseClient: { storage: { from: (bucket: string) => { upload: (path: string, file: File, options?: Record<string, unknown>) => Promise<{ data: { path: string } | null; error: { message: string } | null }> } } },
  file: File,
  folder: string = "logos",
): Promise<string> {
  let processedFile = file;

  // Compress if image
  if (file.type.startsWith("image/")) {
    const maxDim = folder === "logos" ? 512 : 1920;
    processedFile = await compressImage(file, {
      maxWidth: maxDim,
      maxHeight: maxDim,
      quality: folder === "logos" ? 0.85 : 0.8,
    });
  }

  const ext = processedFile.name.split(".").pop() || "webp";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabaseClient.storage.from("company-logos").upload(path, processedFile, {
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw new Error(error.message);
  if (!data?.path) throw new Error("Upload échoué");

  // Return public URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/company-logos/${data.path}`;
}
