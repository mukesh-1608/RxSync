import { type OCRResponse } from "@shared/schema";

export async function performOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResponse> {
  // Fake progress simulation
  if (onProgress) onProgress(10);
  const formData = new FormData();
  formData.append("image", file);
  if (onProgress) onProgress(30);

  try {
    const res = await fetch("/api/process-image", {
      method: "POST",
      body: formData,
    });
    if (onProgress) onProgress(70);

    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);

    const data = await res.json();
    if (onProgress) onProgress(100);
    
    // 🔥 FIX: Ensure we map the server response to the new schema
    return {
        // Fallback: if server sends 'text' (old), map it to 'rawText' (new)
        rawText: data.rawText || data.text || "", 
        structuredData: data.structuredData || [],
        blocks: data.blocks || [] 
    };
  } catch (error) {
    console.error("OCR API Error", error);
    throw error;
  }
}