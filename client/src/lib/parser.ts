import {
  ALL_FIELD_NAMES,
  createEmptyRecord,
  type ParsedRecord,
  REGEX_PATTERNS,
} from "@shared/schema";

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractByPattern(text: string, pattern: RegExp): string[] {
  const matches = text.match(pattern);
  return matches ? matches.map((m) => m.trim()) : [];
}

export function parseOCRText(
  rawText: string,
  imageName: string,
  startRecordNo: number
): ParsedRecord[] {
  const results: ParsedRecord[] = [];
  
  // 1. ROBUST SEGMENTATION: LINE-BY-LINE REASSEMBLY
  // Instead of splitting blindly, we iterate lines and build records.
  const lines = rawText.split('\n');
  let currentRecordBuffer: string[] = [];
  
  // Helper to process a complete buffer into a record
  const processBuffer = (buffer: string[], recIndex: number) => {
    if (buffer.length === 0) return null;
    
    const chunkText = buffer.join("\n"); // Rejoin lines
    const cleanedText = cleanText(chunkText);
    
    // Safety check: A valid record usually has an ID and at least 20 chars
    if (cleanedText.length < 20) return null;

    const record = createEmptyRecord(imageName, startRecordNo + recIndex);
    
    // --- FIELD EXTRACTION ---

    // 1. ID (First word of the block)
    const firstWord = cleanedText.split(" ")[0];
    if (/^\d{5}$/.test(firstWord)) {
        record.UserID = firstWord;
    }

    // 2. Email
    const emails = extractByPattern(cleanedText, REGEX_PATTERNS.email);
    if (emails.length > 0) record.EmailAddress = emails[0];

    // 3. Name Separation (Between ID and Email)
    if (record.EmailAddress && record.UserID) {
        const idIndex = cleanedText.indexOf(record.UserID);
        const emailIndex = cleanedText.indexOf(record.EmailAddress);
        
        if (idIndex !== -1 && emailIndex !== -1 && emailIndex > idIndex) {
            let rawName = cleanedText.substring(idIndex + record.UserID.length, emailIndex).trim();
            // Cleanup: Remove any non-letter chars from start/end
            record.CustomerName = rawName.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
        }
    }

    // 4. Phone Numbers
    const phones = extractByPattern(cleanedText, REGEX_PATTERNS.phone);
    if (phones.length > 0) {
      record.PhNo_1 = phones[0];
      if (phones.length > 1) record.PhNo_2 = phones[1];
    }

    // 5. Gender
    if (/\bMALE\b/i.test(cleanedText)) {
        record.Sex_1 = "MALE";
    } else if (/\bFEMALE\b/i.test(cleanedText)) {
        record.Sex_1 = "FEMALE";
    }

    // 6. Dates
    const dates = extractByPattern(cleanedText, REGEX_PATTERNS.date);
    if (dates.length > 0) {
      record.D_Birth = dates[0];
      record.DOB = dates[0];
      if (dates.length > 1) record.CreateDate = dates[1]; 
    }

    // 7. Zip Codes (Distinct from UserID)
    const zips = extractByPattern(cleanedText, REGEX_PATTERNS.zipCode);
    const validZips = zips.filter(z => z !== record.UserID);
    if (validZips.length > 0) record.Zip_1 = validZips[0];

    // 8. Amounts
    const amounts = extractByPattern(cleanedText, REGEX_PATTERNS.amount);
    const dollarAmounts = amounts.filter((a) => a.includes("$"));
    if (dollarAmounts.length > 0) {
        record.TotalAmount = dollarAmounts[dollarAmounts.length - 1];
    }

    // 9. Medicine
    const commonMeds = ["PHENTERMINE", "VALIUM", "XANAX", "AMBIEN", "ADIPEX", "Klonopin", "LORAZEPAM"];
    for (const med of commonMeds) {
        if (new RegExp(`\\b${med}\\b`, 'i').test(cleanedText)) {
            record.Medicine = med;
            break;
        }
    }

    // 10. State & City Heuristic
    // Look for State Code (2 Uppercase Letters) followed by Zip
    const stateZipRegex = /\b([A-Z]{2})\s+(\d{5})\b/;
    const stateMatch = cleanedText.match(stateZipRegex);
    
    if (stateMatch) {
        record.State_1 = stateMatch[1];
        if (!record.Zip_1) record.Zip_1 = stateMatch[2]; // Fallback if zip regex missed it

        // Smart City Extraction:
        // Textract is good at lines. Usually "Address City State Zip" is on one or two lines.
        // We look for the text immediately *before* the State code.
        const indexState = stateMatch.index;
        if (indexState !== undefined) {
            const textBefore = cleanedText.substring(0, indexState).trim();
            // Take the last 1-2 words before the state as the City
            const words = textBefore.split(/[\s,]+/);
            if (words.length > 0) {
                // Filter out street types to avoid "Road" becoming the city
                const lastWord = words[words.length - 1];
                if (!["Road", "Rd", "St", "Street", "Ave", "Dr", "Lane"].includes(lastWord)) {
                     record.City_1 = lastWord;
                } else if (words.length > 1) {
                     // If last word was "Road", take the word before it? (Risky, better to leave blank than wrong)
                }
            }
        }
    }

    return record;
  };

  // --- MAIN LOOP ---
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // DETECT NEW RECORD START
    // A line starts a new record IF:
    // 1. It starts with 5 digits (The ID)
    // 2. AND it contains an Email (Strongest signal of a header line)
    const startsWithID = /^\d{5}\b/.test(trimmedLine);
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(trimmedLine);

    if (startsWithID && hasEmail) {
        // If we were building a previous record, save it now
        if (currentRecordBuffer.length > 0) {
            const rec = processBuffer(currentRecordBuffer, results.length);
            if (rec) results.push(rec);
        }
        // Start new buffer
        currentRecordBuffer = [trimmedLine];
    } else {
        // This line belongs to the current record (Address, details, etc.)
        // Append it to the buffer
        currentRecordBuffer.push(trimmedLine);
    }
  });

  // Don't forget to process the very last buffer!
  if (currentRecordBuffer.length > 0) {
      const rec = processBuffer(currentRecordBuffer, results.length);
      if (rec) results.push(rec);
  }

  return results;
}

export function generateCSV(records: ParsedRecord[]): string {
  if (records.length === 0) return "";

  const headers = ALL_FIELD_NAMES.join(",");
  const rows = records.map((record) =>
    ALL_FIELD_NAMES.map((field) => {
      const value = record[field] || "";
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(",")
  );

  return [headers, ...rows].join("\n");
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateXML(records: ParsedRecord[]): string {
  const indent = "  ";
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += "<Root>\n";

  for (const record of records) {
    xml += `${indent}<DataM>\n`;
    for (const field of ALL_FIELD_NAMES) {
      const value = escapeXML(record[field] || "");
      xml += `${indent}${indent}<${field}>${value}</${field}>\n`;
    }
    xml += `${indent}</DataM>\n`;
  }

  xml += "</Root>";
  return xml;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}