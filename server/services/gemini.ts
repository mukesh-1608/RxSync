import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * 🧹 STEP 2.5: DETERMINISTIC NORMALIZER
 * This layer cleans raw OCR artifacts before the LLM sees them.
 * It fixes "Dirty Tokens" so the LLM doesn't have to guess.
 */
function cleanOCRText(rawText: string): string {
  let cleaned = rawText;

  // 1. Fix Blood Type Artifacts (Common Textract errors like $BB+, $O+)
  cleaned = cleaned
    .replace(/\$BB\+/g, "B+")
    .replace(/\$B\+/g, "B+")
    .replace(/\$A\+/g, "A+")
    .replace(/\$O\+/g, "O+")
    .replace(/\$AB\+/g, "AB+")
    // Handle 'BB+' without dollar sign if it appears due to noise
    .replace(/\bBB\+\b/g, "B+");

  // 2. Normalize common field labels to help LLM anchoring
  // We add spacing to ensure words like "MALE" aren't stuck to other text
  cleaned = cleaned
    .replace(/Order ID:/i, "Order ID:")
    .replace(/MALE/g, " MALE ")    
    .replace(/FEMALE/g, " FEMALE ");

  return cleaned;
}

/**
 * 🛡️ STEP 4: POST-LLM VALIDATOR
 * Strictly enforces that no XML tags are returned empty.
 */
function enforceNoEmptyTags(xml: string): string {
  // Regex to find <Tag></Tag> or <Tag /> and replace with MISSING value
  // This catches any slip-ups by the LLM
  return xml.replace(
    /<(\w+)>\s*<\/\1>/g,
    `<$1><value confidence="low">MISSING</value></$1>`
  );
}

// ⚡ FINAL "TEXT-ONLY" PROMPT
// Optimized for mapping cleaned text -> XML without visual distractions.
const SYSTEM_PROMPT = `
You are a Medical Data XML Mapper. 
Input: Cleaned OCR text.
Output: Strict XML.

### 🔍 ANCHORING LOGIC (HOW TO FIND DATA)
1. **DOCTOR EXTRACTION**:
   - Row Layout: \`[Patient Name] ... [Vitals] ... [Patient Name REPEATED] [DOCTOR NAME]\`
   - Find the **SECOND occurrence** of the Patient Name in the row.
   - The name immediately following it is the **Doctor**.
   
2. **DOB LOCKING**:
   - DOB is **ALWAYS** the date immediately following the Gender (MALE/FEMALE).
   - Ignore all other dates (like Order Date) for the DOB field.

3. **BLOOD TYPE**:
   - The input text has already been normalized. 
   - Look for standard enums: A+, A-, B+, B-, AB+, AB-, O+, O- in the Vitals section.
   - If a valid enum exists, extract it. Otherwise, mark as MISSING.

### 🚨 MANDATORY COMPLETENESS RULE:
- **NEVER output empty tags** (e.g., <Weight></Weight> is FORBIDDEN).
- If a value exists in text, extract it.
- If a value is NOT found in the text, you must output: 
  \`<value confidence="low">MISSING</value>\`

### XML OUTPUT SCHEMA
<MedicalDocument>
    <Patient>
        <Name>[Full Name]</Name>
        <DOB>[MM/DD/YYYY]</DOB>
        <Gender>[MALE/FEMALE]</Gender>
    </Patient>
    <Doctor>
        <Name>[Doctor Name]</Name>
        <LicenseNumber><value confidence="low">MISSING</value></LicenseNumber>
        <Clinic>[City/State found after Doctor Name]</Clinic>
    </Doctor>
    <Prescription>
        <Medicine>
            <Name>[Drug Name]</Name>
            <Dosage>[Strength e.g. 2 MG]</Dosage>
            <Frequency>[Count: e.g. 90]</Frequency>
            <Duration><value confidence="low">MISSING</value></Duration>
        </Medicine>
    </Prescription>
    <Vitals>
        <Height>[Height]</Height>
        <Weight>[Weight]</Weight>
        <BloodType>[Enum: A+, B+, AB+, O+, etc]</BloodType>
        <BloodPressure><value confidence="low">MISSING</value></BloodPressure>
    </Vitals>
    <Notes>Order ID: [ID]</Notes>
</MedicalDocument>

### FINAL VERIFICATION:
1. Did you find the Doctor by looking *after* the repeated patient name?
2. Did you pick the DOB *immediately* after the Gender?
3. Did you verify NO tags are empty?

OUTPUT ONLY VALID XML.
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
    const available = models.filter(m => m.supportedGenerationMethods.includes("generateContent"));

    // PRIORITY: Keep the working model at the top
    const preferredOrder = [
      "gemini-robotics-er-1.5-preview", 
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

    // Fallback
    const anyVision = available.find(m => m.name.includes("vision") || m.name.includes("1.5"));
    if (anyVision) {
        const cleanName = anyVision.name.replace("models/", "");
        console.log(`⚠️ Using fallback model: ${cleanName}`);
        return cleanName;
    }

    throw new Error("No Vision-capable models found for this API Key.");

  } catch (error: any) {
    console.error("❌ Model Discovery Failed:", error.message);
    return "gemini-1.5-flash";
  }
}

export async function processWithGemini(fileBuffer: Buffer, ocrText: string): Promise<string> {
  try {
    // STEP 2.5: Normalize the text before LLM sees it
    console.log("🧹 Running Step 2.5: Deterministic Normalizer...");
    const cleanedText = cleanOCRText(ocrText);

    // STEP 3: LLM Mapping (TEXT ONLY - No Image)
    const modelName = await getBestAvailableModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    // Note: We intentionally DO NOT send the image buffer here.
    // We rely 100% on the normalized text to prevent visual hallucinations.
    console.log(`🚀 Sending CLEANED TEXT to Gemini (${modelName})...`);
    
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `CLEANED OCR CONTEXT:\n${cleanedText}`
    ]);

    const response = await result.response;
    let text = response.text();
    text = text.replace(/```xml/g, "").replace(/```/g, "").trim();

    // STEP 4: Post-LLM Validation
    console.log("🛡️ Running Step 4: Enforcing XML Completeness...");
    text = enforceNoEmptyTags(text);

    return text;

  } catch (error: any) {
    console.error("❌ GEMINI FATAL ERROR:", error);
    if (error.message.includes("404")) {
        throw new Error("Gemini Model Not Found. Please ensure 'Generative Language API' is ENABLED in Google Cloud Console.");
    }
    throw new Error(`Gemini Error: ${error.message}`);
  }
}