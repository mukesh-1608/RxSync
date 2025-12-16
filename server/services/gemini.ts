import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_PROMPT = `
You are an expert Medical Data Transcriptionist. 
Your job is to convert medical pharmacy order forms (images + OCR text) into strict XML format.

### INPUT DATA:
1. An image of a spreadsheet containing patient, doctor, and prescription details.
2. Raw OCR text extracted from the image.

### XML SCHEMA REQUIREMENT:
You must output valid XML rooted with <MedicalDocument>. 
If multiple records exist in the image, output multiple <MedicalDocument> blocks wrapped in a <Root> tag.

Schema Structure:
<MedicalDocument>
    <Patient>
        <Name>[Full Name]</Name>
        <DOB>[Date of Birth MM/DD/YYYY]</DOB>
        <Gender>[MALE/FEMALE]</Gender>
    </Patient>
    <Doctor>
        <Name>[Doctor Name]</Name>
        <LicenseNumber>[License/NPI if available]</LicenseNumber>
        <Clinic>[Clinic Name]</Clinic>
    </Doctor>
    <Prescription>
        <Medicine>
            <Name>[Drug Name]</Name>
            <Dosage>[Strength e.g. 10MG]</Dosage>
            <Frequency>[Frequency if available]</Frequency>
            <Duration>[Duration if available]</Duration>
        </Medicine>
    </Prescription>
    <Vitals>
        <Height>[Height]</Height>
        <Weight>[Weight]</Weight>
        <BloodPressure>[BP]</BloodPressure>
    </Vitals>
    <Notes>[Any extra notes or order IDs]</Notes>
</MedicalDocument>

### RULES:
1. Only extract visible text. 
2. Return ONLY the XML string. No markdown.
`;

/**
 * 🔍 SMART DISCOVERY:
 * Connects to Google to find which models are actually enabled for this API Key.
 */
async function getBestAvailableModel(): Promise<string> {
  try {
    console.log("🔍 Discovering available Gemini models...");
    
    // Direct fetch to list models specific to this API key
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("API Key Valid but API DISABLED. Go to Google Console > Enable 'Generative Language API'.");
      }
      throw new Error(`Discovery failed with status: ${response.status}`);
    }

    const data = await response.json();
    const models = (data.models || []) as { name: string, supportedGenerationMethods: string[] }[];

    // Filter for models that support content generation
    const available = models.filter(m => m.supportedGenerationMethods.includes("generateContent"));

    // Strategy: Prefer 1.5 Flash -> 1.5 Pro -> Pro Vision
    const preferredOrder = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro-vision",
      "gemini-1.0-pro-vision"
    ];

    for (const pref of preferredOrder) {
      const match = available.find(m => m.name.includes(pref));
      if (match) {
        const cleanName = match.name.replace("models/", "");
        console.log(`✅ Found optimized model: ${cleanName}`);
        return cleanName;
      }
    }

    // Fallback: take the first one that looks like a vision model
    const anyVision = available.find(m => m.name.includes("vision") || m.name.includes("1.5"));
    if (anyVision) {
        const cleanName = anyVision.name.replace("models/", "");
        console.log(`⚠️ Using fallback model: ${cleanName}`);
        return cleanName;
    }

    throw new Error("No Vision-capable models found for this API Key.");

  } catch (error: any) {
    console.error("❌ Model Discovery Failed:", error.message);
    // Ultimate fallback if discovery fails (e.g. firewall)
    console.log("⚠️ Attempting blind fallback to 'gemini-1.5-flash'...");
    return "gemini-1.5-flash";
  }
}

export async function processWithGemini(fileBuffer: Buffer, ocrText: string): Promise<string> {
  try {
    // 1. Find the correct model name
    const modelName = await getBestAvailableModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    // 2. Prepare Image
    const imageBase64 = fileBuffer.toString("base64");

    // 3. Generate
    console.log(`🚀 Sending request to Gemini (${modelName})...`);
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      },
      `OCR TEXT CONTEXT:\n${ocrText}`
    ]);

    const response = await result.response;
    let text = response.text();
    text = text.replace(/```xml/g, "").replace(/```/g, "").trim();

    return text;

  } catch (error: any) {
    console.error("❌ GEMINI FATAL ERROR:", error);
    
    // Provide a clear message to the frontend
    if (error.message.includes("404")) {
        throw new Error("Gemini Model Not Found. Please ensure 'Generative Language API' is ENABLED in Google Cloud Console.");
    }
    throw new Error(`Gemini Error: ${error.message}`);
  }
}