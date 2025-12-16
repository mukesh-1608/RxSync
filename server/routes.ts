import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { uploadToS3, performTextractAnalysis } from "./services/aws";
import { processWithGemini } from "./services/gemini";

// Keep memory storage to pass buffer to Gemini easily
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/process-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      console.log(`[1/3] Uploading ${req.file.originalname} to S3...`);
      const s3Key = await uploadToS3(req.file);

      console.log(`[2/3] Analyzing text with AWS Textract...`);
      const { rawLines } = await performTextractAnalysis(s3Key);

      console.log(`[3/3] Generating XML with Gemini...`);
      // We pass both the image buffer (visual context) and Textract lines (text context)
      const xmlOutput = await processWithGemini(req.file.buffer, rawLines);

      res.json({ 
        success: true,
        xml: xmlOutput,
        rawText: rawLines
      });

    } catch (error) {
      console.error("Pipeline Error:", error);
      res.status(500).json({ 
        message: "Processing failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  return httpServer;
}