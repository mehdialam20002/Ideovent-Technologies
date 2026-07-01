import { supabaseEnabled, supabase } from "./client";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image and return a usable URL.
 * - Supabase mode: uploads to the public `media` storage bucket → CDN URL.
 * - Local mode: returns a base64 data URL (works instantly, lives in the content snapshot).
 */
export async function uploadImage(file: File): Promise<string> {
  if (supabaseEnabled) {
    const safe = file.name.replace(/[^\w.-]/g, "_");
    const path = `uploads/${Date.now()}_${safe}`;
    const { error } = await supabase().storage.from("media").upload(path, file, { upsert: false, cacheControl: "3600" });
    if (error) throw error;
    const { data } = supabase().storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  }
  return fileToDataUrl(file);
}
