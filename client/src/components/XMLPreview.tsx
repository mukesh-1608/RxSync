import { useState } from "react";
import { Copy, Check, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface XMLPreviewProps {
  xml: string;
}

function SyntaxHighlight({ xml }: { xml: string }) {
  const lines = xml.split("\n");

  return (
    <pre className="text-xs font-mono leading-relaxed">
      {lines.map((line, index) => {
        const highlightedLine = line
          .replace(
            /(<\/?)(\w+)(>)/g,
            '<span class="text-primary">$1</span><span class="text-blue-600 dark:text-blue-400">$2</span><span class="text-primary">$3</span>'
          )
          .replace(
            /(<\?xml[^?]*\?>)/g,
            '<span class="text-muted-foreground">$1</span>'
          );

        return (
          <div key={index} className="flex">
            <span className="select-none text-muted-foreground/50 w-8 text-right pr-3 flex-shrink-0">
              {index + 1}
            </span>
            <span
              dangerouslySetInnerHTML={{ __html: highlightedLine }}
              className="text-foreground"
            />
          </div>
        );
      })}
    </pre>
  );
}

export function XMLPreview({ xml }: XMLPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!xml) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center border rounded-md"
        data-testid="empty-xml-preview"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileCode className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">
          No XML generated yet. Click "Generate XML" to create the output.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md" data-testid="xml-preview">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">XML Output</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          data-testid="button-copy-xml"
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
      <ScrollArea className="h-96">
        <div className="p-4 bg-card">
          <SyntaxHighlight xml={xml} />
        </div>
      </ScrollArea>
    </div>
  );
}
