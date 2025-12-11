export interface OCRResult {
  text: string;
  confidence: number;
}

export async function preprocessImage(file: File): Promise<File> {
  // We no longer strictly need canvas preprocessing for AWS as it is robust.
  // We just return the file as-is to save processing time on the client.
  return file;
}

export async function performOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  
  // Fake progress because we can't track server-side AWS progress easily
  // without websockets. This gives UI feedback.
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

    if (!res.ok) {
      throw new Error(`Server error: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (onProgress) onProgress(100);
    
    return {
      text: data.text,
      confidence: 90, // AWS doesn't give a single confidence score for the whole doc easily, defaulting high.
    };
  } catch (error) {
    console.error("OCR API Error", error);
    throw error;
  }
}