import { X, Loader2, Check, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UploadedImage, ImageStatus } from "@shared/schema";

interface ImagePreviewGridProps {
  images: UploadedImage[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function getStatusBadge(status: ImageStatus, progress: number) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs">
          Pending
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {progress}%
        </Badge>
      );
    case "complete":
      return (
        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
          <Check className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
  }
}

export function ImagePreviewGrid({ images, onRemove, disabled }: ImagePreviewGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-image-grid">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">No images uploaded yet</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      data-testid="image-preview-grid"
    >
      {images.map((image) => (
        <div
          key={image.id}
          className={cn(
            "relative group rounded-md border bg-card overflow-hidden",
            image.status === "error" && "border-destructive"
          )}
          data-testid={`image-preview-${image.id}`}
        >
          <div className="aspect-square relative">
            <img
              src={image.preview}
              alt={image.file.name}
              className="w-full h-full object-cover"
            />
            
            {image.status === "processing" && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-medium">{image.progress}%</p>
                </div>
              </div>
            )}

            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(image.id)}
              disabled={disabled || image.status === "processing"}
              data-testid={`button-remove-image-${image.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p
                className="text-xs font-medium truncate flex-1"
                title={image.file.name}
              >
                {image.file.name}
              </p>
              {getStatusBadge(image.status, image.progress)}
            </div>

            {image.status === "processing" && (
              <Progress value={image.progress} className="h-1" />
            )}

            {image.error && (
              <p className="text-xs text-destructive truncate" title={image.error}>
                {image.error}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
