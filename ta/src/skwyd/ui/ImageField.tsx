// Photo picker: shrinks the photo in the browser, uploads it to the public "menu" storage bucket and keeps its link (same as the portal's uploadImage)
import { Button } from "@/components/ui/button";
import { CameraIcon } from "@/icons";
import { sb } from "@/lib/supabase";
import { cn } from "@/utils";
import { useRef, useState } from "react";

export async function uploadImage(file: File, max = 800) {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  const blob = await new Promise<Blob>(r => c.toBlob(b => r(b!), "image/jpeg", 0.85));
  const path = "products/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ".jpg";
  const { error } = await sb.storage.from("menu").upload(path, blob, { contentType: "image/jpeg", upsert: false }); if (error) throw error;
  return sb.storage.from("menu").getPublicUrl(path).data.publicUrl;
}

export function ImageField({ value, onChange, wide, hint = "JPG or PNG. It's resized automatically for the POS, call center and web menu." }: { value: string; onChange: (url: string) => void; wide?: boolean; hint?: string }) {
  const inp = useRef<HTMLInputElement>(null), [st, setSt] = useState(""), [drag, setDrag] = useState(false);
  const take = async (f?: File | null) => { if (!f) return; setSt("Uploading photo…"); try { onChange(await uploadImage(f, wide ? 1600 : 800)); setSt("Photo ready. Save to keep it."); } catch (e: any) { setSt("Couldn't upload the photo: " + (e?.message || "try again")); } };
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <button type="button" onClick={() => inp.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
        className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed bg-gray-50 text-gray-400 transition-colors dark:bg-[#090E1A]", wide ? "h-24 w-full sm:w-56" : "size-24",
          drag ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-500 dark:border-gray-700")} aria-label="Choose photo">
        {value ? <img src={value} alt="" className="size-full object-cover" /> : <CameraIcon className="size-7" />}</button>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => inp.current?.click()}>{value ? "Change photo" : "Choose photo"}</Button>
          {value && <Button type="button" variant="outline" size="sm" onClick={() => { onChange(""); setSt(""); }}>Remove photo</Button>}</div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{st || hint}</p>
      </div>
      <input ref={inp} type="file" accept="image/*" hidden onChange={e => { take(e.target.files?.[0]); e.target.value = ""; }} />
    </div>);
}
