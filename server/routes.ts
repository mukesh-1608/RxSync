import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

// Configure Multer for memory storage (files held in RAM to send to AWS)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize AWS Client
// Make sure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are in your .env file
const textract = new TextractClient({ region: process.env.AWS_REGION || "us-east-1" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // API Route to handle OCR via AWS Textract
  app.post("/api/process-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

      const params = {
        Document: {
          Bytes: req.file.buffer,
        },
      };

      const command = new DetectDocumentTextCommand(params);
      const response = await textract.send(command);

      // EXTRACT LINES
      // Textract returns separate "LINES" and "WORDS". We want the lines to preserve row structure.
      const lines = response.Blocks
        ?.filter(block => block.BlockType === "LINE")
        .map(block => block.Text)
        .join("\n");

      res.json({ text: lines || "" });

    } catch (error) {
      console.error("Textract Error:", error);
      res.status(500).json({ message: "Failed to process image with AWS Textract" });
    }
  });

  return httpServer;
}