import { useState, useCallback, useEffect } from "react";
import {
  FileCode,
  FileSpreadsheet,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Scan,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ImageUploadZone } from "@/components/ImageUploadZone";
import { ImagePreviewGrid } from "@/components/ImagePreviewGrid";
import { OCRResultsPanel } from "@/components/OCRResultsPanel";
import { DataTable } from "@/components/DataTable";
import { XMLPreview } from "@/components/XMLPreview";
import { ThemeToggle } from "@/components/ThemeToggle";
import { performOCR } from "@/lib/ocr"; // Removed preprocessImage import
import { parseOCRText, generateCSV, generateXML, downloadFile } from "@/lib/parser";
import type { UploadedImage, ParsedRecord } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [xmlOutput, setXmlOutput] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (uploadedImages.length > 0) {
      setCompletedSteps((prev) => {
        if (prev.includes(1)) return prev;
        return [...prev, 1];
      });
    } else {
      setCompletedSteps((prev) => prev.filter((s) => s !== 1));
      setCurrentStep((prev) => (prev > 1 ? 1 : prev));
    }
  }, [uploadedImages.length]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const newImages: UploadedImage[] = files.map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
        progress: 0,
        rawText: "",
        parsedData: null,
      }));

      setUploadedImages((prev) => [...prev, ...newImages]);

      toast({
        title: "Images uploaded",
        description: `${files.length} image${files.length > 1 ? "s" : ""} added successfully.`,
      });
    },
    [toast]
  );

  const handleRemoveImage = useCallback((id: string) => {
    setUploadedImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      const remaining = prev.filter((img) => img.id !== id);
      
      if (remaining.length === 0) {
        setParsedData([]);
        setXmlOutput("");
        setCompletedSteps([]);
        setCurrentStep(1);
      }
      
      return remaining;
    });
  }, []);

  const processImages = useCallback(async () => {
    const pendingImages = uploadedImages.filter(
      (img) => img.status === "pending" || img.status === "error"
    );

    if (pendingImages.length === 0) {
      toast({
        title: "No images to process",
        description: "All images have already been processed.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setCurrentStep(2);

    let successCount = 0;
    // Calculate a global starting index for records so IDs don't clash across images
    let currentRecordCount = parsedData.length + 1; 

    for (const image of pendingImages) {
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? { ...img, status: "processing" as const, progress: 0 }
            : img
        )
      );

      try {
        // Direct file OCR (no client-side preprocessing needed for AWS)
        const ocrResult = await performOCR(image.file, (progress) => {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === image.id ? { ...img, progress } : img
            )
          );
        });

        const parsedRecords = parseOCRText(
          ocrResult.text,
          image.file.name,
          currentRecordCount
        );
        
        currentRecordCount += parsedRecords.length;

        setUploadedImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: "complete" as const,
                  progress: 100,
                  rawText: ocrResult.text,
                  parsedData: parsedRecords,
                }
              : img
          )
        );
        successCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "OCR processing failed";

        setUploadedImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: "error" as const,
                  error: errorMessage,
                }
              : img
          )
        );

        toast({
          title: "Processing error",
          description: `Failed to process ${image.file.name}: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }

    setProcessing(false);

    setUploadedImages((current) => {
      const completedImages = current.filter((img) => img.status === "complete");
      // Flatten the arrays of records from all images
      const newParsedData = completedImages
        .flatMap((img) => img.parsedData || []);
        
      setParsedData(newParsedData);
      
      if (newParsedData.length > 0) {
        setCompletedSteps((prev) => {
          const updated = [...prev];
          if (!updated.includes(2)) updated.push(2);
          return updated;
        });
        setCurrentStep(3);
      }
      
      return current;
    });

    if (successCount > 0) {
      toast({
        title: "Processing complete",
        description: `Successfully processed ${successCount} image${successCount > 1 ? "s" : ""}. Review the parsed data below.`,
      });
    }
  }, [uploadedImages, toast, parsedData.length]);

  const handleRetryFailed = useCallback(() => {
    setUploadedImages((prev) =>
      prev.map((img) =>
        img.status === "error"
          ? { ...img, status: "pending" as const, error: undefined, progress: 0 }
          : img
      )
    );
  }, []);

  const handleDataChange = useCallback((newData: ParsedRecord[]) => {
    setParsedData(newData);
  }, []);

  const handleDownloadCSV = useCallback(() => {
    if (parsedData.length === 0) {
      toast({
        title: "No data to export",
        description: "Process some images first to generate CSV.",
        variant: "destructive",
      });
      return;
    }

    const csv = generateCSV(parsedData);
    downloadFile(csv, "pharmacy_data.csv", "text/csv");

    toast({
      title: "CSV downloaded",
      description: "Your CSV file has been saved.",
    });
  }, [parsedData, toast]);

  const handleGenerateXML = useCallback(() => {
    if (parsedData.length === 0) {
      toast({
        title: "No data to export",
        description: "Process some images first to generate XML.",
        variant: "destructive",
      });
      return;
    }

    const xml = generateXML(parsedData);
    setXmlOutput(xml);
    setCompletedSteps((prev) => {
      const updated = [...prev];
      if (!updated.includes(3)) updated.push(3);
      return updated;
    });
    setCurrentStep(4);

    toast({
      title: "XML generated",
      description: "Your XML output is ready for download.",
    });
  }, [parsedData, toast]);

  const handleDownloadXML = useCallback(() => {
    if (!xmlOutput) {
      toast({
        title: "No XML to download",
        description: "Generate XML first before downloading.",
        variant: "destructive",
      });
      return;
    }

    downloadFile(xmlOutput, "pharmacy_data.xml", "application/xml");
    setCompletedSteps((prev) => {
      const updated = [...prev];
      if (!updated.includes(4)) updated.push(4);
      return updated;
    });

    toast({
      title: "XML downloaded",
      description: "Your XML file has been saved.",
    });
  }, [xmlOutput, toast]);

  const hasImages = uploadedImages.length > 0;
  const hasPendingImages = uploadedImages.some(
    (img) => img.status === "pending"
  );
  const hasFailedImages = uploadedImages.some((img) => img.status === "error");

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center" data-testid="logo">
                <Scan className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground" data-testid="text-app-title">
                  PharmaScan
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Image to XML Converter
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <Card>
            <CardContent className="py-6">
              <ProgressStepper
                currentStep={currentStep}
                completedSteps={completedSteps}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary" data-testid="step-number-1">
                  1
                </div>
                <div>
                  <CardTitle className="text-xl">Upload Images</CardTitle>
                  <CardDescription>
                    Add pharmacy order form images for processing
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUploadZone
                onFilesSelected={handleFilesSelected}
                disabled={processing}
              />
              <ImagePreviewGrid
                images={uploadedImages}
                onRemove={handleRemoveImage}
                disabled={processing}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary" data-testid="step-number-2">
                    2
                  </div>
                  <div>
                    <CardTitle className="text-xl">OCR Processing</CardTitle>
                    <CardDescription>
                      Extract text from uploaded images (Powered by AWS Textract)
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasFailedImages && (
                    <Button
                      variant="outline"
                      onClick={handleRetryFailed}
                      disabled={processing}
                      data-testid="button-retry-failed"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry Failed
                    </Button>
                  )}
                  <Button
                    onClick={processImages}
                    disabled={!hasImages || processing || !hasPendingImages}
                    data-testid="button-process-images"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Process Images
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <OCRResultsPanel images={uploadedImages} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary" data-testid="step-number-3">
                    3
                  </div>
                  <div>
                    <CardTitle className="text-xl">Review Parsed Data</CardTitle>
                    <CardDescription>
                      Edit and verify extracted information ({parsedData.length} record{parsedData.length !== 1 ? "s" : ""})
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadCSV}
                  disabled={parsedData.length === 0}
                  data-testid="button-download-csv"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable data={parsedData} onDataChange={handleDataChange} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary" data-testid="step-number-4">
                    4
                  </div>
                  <div>
                    <CardTitle className="text-xl">Generate XML</CardTitle>
                    <CardDescription>
                      Create structured XML output from parsed data
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleGenerateXML}
                    disabled={parsedData.length === 0}
                    data-testid="button-generate-xml"
                  >
                    <FileCode className="w-4 h-4 mr-2" />
                    Generate XML
                  </Button>
                  <Button
                    onClick={handleDownloadXML}
                    disabled={!xmlOutput}
                    data-testid="button-download-xml"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download XML
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <XMLPreview xml={xmlOutput} />
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground text-center" data-testid="text-footer">
            PharmaScan - Pharmacy Order Form Image to XML Converter
          </p>
        </div>
      </footer>
    </div>
  );
}