import { useCallback, useState } from "react";
import { Upload, ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function ImageUploadZone({ onFilesSelected, disabled }: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback((files: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only JPG, JPEG, and PNG are allowed.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size is 10MB.`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(" "));
      setTimeout(() => setError(null), 5000);
    }

    return validFiles;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected, validateFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = validateFiles(e.target.files);
        if (files.length > 0) {
          onFilesSelected(files);
        }
      }
      e.target.value = "";
    },
    [onFilesSelected, validateFiles]
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-md transition-colors min-h-64 flex flex-col items-center justify-center p-8",
          isDragging && "border-primary bg-primary/5",
          !isDragging && !disabled && "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed border-muted"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="upload-drop-zone"
      >
        <input
          type="file"
          id="file-upload"
          className="sr-only"
          accept=".jpg,.jpeg,.png"
          multiple
          onChange={handleFileInput}
          disabled={disabled}
          data-testid="input-file-upload"
        />

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isDragging ? (
              <ImageIcon className="w-8 h-8 text-primary" />
            ) : (
              <Upload className="w-8 h-8 text-primary" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isDragging ? "Drop images here" : "Drag and drop your images"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click the button below to browse files
            </p>
          </div>

          <Button
            variant="default"
            disabled={disabled}
            onClick={() => document.getElementById("file-upload")?.click()}
            data-testid="button-browse-files"
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>

          <p className="text-xs text-muted-foreground">
            Supports JPG, JPEG, PNG up to 10MB each
          </p>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm"
          role="alert"
          data-testid="upload-error-message"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
