import { z } from "zod";

export const ALL_FIELD_NAMES = [
  "ImageName",
  "RecordNo",
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

export type ImageStatus = "pending" | "processing" | "complete" | "error";

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: ImageStatus;
  progress: number;
  rawText: string;
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
  return record;
}

export const REGEX_PATTERNS = {
  email: /[\w.-]+@[\w.-]+\.\w+/gi,
  // FIXED: Added \b to start to prevent matching end of zip codes
  phone: /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  zipCode: /\b\d{5}(-\d{4})?\b/g,
  date: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  amount: /\$?\d+\.?\d{0,2}/g,
  weight: /\b\d{2,3}\s?(lbs?|kg|kgs)\b/gi,
  height: /\b\d['']?\d{1,2}[""]?\b|\b\d{3}\s?cm\b/gi,
  dosage: /\b\d+\s?(mg|mcg|g|ml)\b/gi,
  bloodGroup: /\b(A|B|AB|O)[+-]\b/g,
};

export const FIELD_KEYWORDS: Record<string, FieldName[]> = {
  patient: ["CustomerName"],
  customer: ["CustomerName"],
  name: ["CustomerName", "BillingName", "ShipperName", "Name_P_Holder"],
  email: ["EmailAddress"],
  "e-mail": ["EmailAddress"],
  address: ["ResAddress"],
  city: ["City_1", "City_2"],
  state: ["State_1", "State_2"],
  zip: ["Zip_1", "Zip_2"],
  phone: ["PhNo_1", "PhNo_2"],
  country: ["Country_1", "Country_2"],
  sex: ["Sex_1", "Sex_2"],
  gender: ["Sex_1", "Sex_2"],
  dob: ["D_Birth", "DOB"],
  "date of birth": ["D_Birth", "DOB"],
  birth: ["D_Birth", "DOB"],
  height: ["Height"],
  weight: ["Weight"],
  blood: ["Blood_Group"],
  alcoholic: ["Alcoholic"],
  smoker: ["Smoker"],
  surgery: ["PastSug"],
  diabetic: ["Diabetic"],
  allergy: ["Allergiesd"],
  allergies: ["Allergiesd"],
  billing: ["BillingName"],
  shipper: ["ShipperName"],
  shipping: ["ShippingCost", "ShipperName"],
  card: ["CardName"],
  total: ["TotalAmount"],
  amount: ["TotalAmount", "Cost"],
  remark: ["Remarks"],
  policy: ["PloicyNo"],
  premium: ["P_Inst"],
  holder: ["Name_P_Holder"],
  medicine: ["Medicine"],
  drug: ["Medicine"],
  dosage: ["Dosage"],
  dose: ["Dosage"],
  tablet: ["Tablets"],
  quantity: ["Tablets"],
  pill: ["PillRate"],
  rate: ["PillRate"],
  cost: ["Cost"],
  price: ["Cost", "PillRate"],
};