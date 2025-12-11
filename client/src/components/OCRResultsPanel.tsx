import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UploadedImage } from "@shared/schema";

interface OCRResultsPanelProps {
  images: UploadedImage[];
}

function OCRResultItem({ image }: { image: UploadedImage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (image.rawText) {
      await navigator.clipboard.writeText(image.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!image.rawText && image.status !== "complete") {
    return null;
  }

  return (
    <div className="border rounded-md" data-testid={`ocr-result-${image.id}`}>
      <button
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover-elevate active-elevate-2"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        data-testid={`button-toggle-ocr-${image.id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium truncate">{image.file.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {image.rawText ? `${image.rawText.length} chars` : "No text"}
        </Badge>
      </button>

      {isExpanded && (
        <div className="border-t">
          <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/50">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              disabled={!image.rawText}
              data-testid={`button-copy-ocr-${image.id}`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {image.rawText || "No text extracted"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function OCRResultsPanel({ images }: OCRResultsPanelProps) {
  const completedImages = images.filter(
    (img) => img.status === "complete" && img.rawText
  );

  if (completedImages.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="empty-ocr-results"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">
          No OCR results yet. Process images to see extracted text.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="ocr-results-panel">
      {completedImages.map((image) => (
        <OCRResultItem key={image.id} image={image} />
      ))}
    </div>
  );
}
