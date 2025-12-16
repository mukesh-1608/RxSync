import { z } from "zod";

export const ALL_FIELD_NAMES = [
  "ImageName",
  "RecordNo",
  "ConfidenceScore",
  "CustomerName",
  "EmailAddress",
  "ResAddress",
  "City_1",
  "State_1",
  "Zip_1",
  "PhNo_1",
  "Country_1",
  "Sex_1",
  "D_Birth",
  "Height",
  "Weight",
  "Blood_Group",
  "Alcoholic",
  "Smoker",
  "PastSug",
  "Diabetic",
  "Allergiesd",
  "BillingName",
  "ShipperName",
  "City_2",
  "State_2",
  "Zip_2",
  "Country_2",
  "PhNo_2",
  "CardName",
  "ShippingCost",
  "TotalAmount",
  "Remarks",
  "PloicyNo",
  "D_B_Life_Assure",
  "P_Inst",
  "Name_P_Holder",
  "STM_Name",
  "STM_Code",
  "Medicine",
  "Dosage",
  "Tablets",
  "PillRate",
  "Cost",
  "DOB",
  "Sex_2",
  "UserID",
  "CreateDate",
  "UpdateDate",
] as const;

export type FieldName = (typeof ALL_FIELD_NAMES)[number];
export type ParsedRecord = Record<FieldName, string>;

export const parsedRecordSchema = z.object(
  ALL_FIELD_NAMES.reduce(
    (acc, field) => {
      acc[field] = z.string();
      return acc;
    },
    {} as Record<FieldName, z.ZodString>
  )
);

// --- OCR Data Structures ---
export interface OCRBlock {
  text: string;
  box: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface OCRResponse {
  rawText: string;
  // If the Server uses GenAI, it populates this field with the clean JSON
  structuredData?: any[]; 
  blocks?: OCRBlock[];
}

export type ImageStatus = "pending" | "processing" | "complete" | "error";

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: ImageStatus;
  progress: number;
  ocrResponse: OCRResponse | null;
  parsedData: ParsedRecord[] | null;
  error?: string;
}

export function createEmptyRecord(imageName: string, recordNo: number): ParsedRecord {
  const record = {} as ParsedRecord;
  for (const field of ALL_FIELD_NAMES) {
    record[field] = "";
  }
  record.ImageName = imageName;
  record.RecordNo = String(recordNo);
  record.ConfidenceScore = "0%";
  return record;
}