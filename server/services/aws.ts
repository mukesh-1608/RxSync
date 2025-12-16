import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient, AnalyzeDocumentCommand, FeatureType } from "@aws-sdk/client-textract";

// Initialize AWS Clients
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

const textractClient = new TextractClient({ 
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "pharmascan-uploads";

export async function uploadToS3(file: Express.Multer.File): Promise<string> {
  const key = `uploads/${Date.now()}_${file.originalname}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));

  return key;
}

export async function performTextractAnalysis(s3Key: string) {
  const command = new AnalyzeDocumentCommand({
    Document: {
      S3Object: {
        Bucket: BUCKET_NAME,
        Name: s3Key
      }
    },
    FeatureTypes: [FeatureType.TABLES, FeatureType.FORMS]
  });

  const response = await textractClient.send(command);
  
  // Extract raw lines to give the LLM sequential context
  const rawLines = response.Blocks
    ?.filter(b => b.BlockType === 'LINE')
    .map(b => b.Text)
    .join('\n') || "";

  return { rawLines, blocks: response.Blocks };
}