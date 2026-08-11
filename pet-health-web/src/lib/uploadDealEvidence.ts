import { compressImageFile } from "./compressImageFile";
import {
  DealSubmitError,
  NEXT_FUNCTION_PHOTO_MAX_BYTES,
} from "./dealPhotoUpload";

export async function uploadDealEvidencePhotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const ready = await compressImageFile(file);
    if (ready.size > NEXT_FUNCTION_PHOTO_MAX_BYTES) {
      throw new DealSubmitError(
        "Request Entity Too Large",
        413,
        "FUNCTION_PAYLOAD_TOO_LARGE",
      );
    }
    const fd = new FormData();
    fd.set("kind", "photo");
    fd.set("file", ready, ready.name || "photo.jpg");
    const res = await fetch("/api/pet-feed/upload-photo", {
      method: "POST",
      body: fd,
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      data?: { publicUrl?: string };
    };
    if (!res.ok) {
      throw new DealSubmitError(
        String(data.error || "Failed"),
        res.status,
        data.code,
      );
    }
    const url = data.data?.publicUrl;
    if (!url) throw new DealSubmitError("Failed", res.status);
    urls.push(url);
  }
  return urls;
}
