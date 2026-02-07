import { useState } from "react";
import { Link2, Loader2, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface UrlUploadProps {
  onFileDownloaded: (file: File) => Promise<void>;
  disabled?: boolean;
}

interface DownloadState {
  url: string;
  status: "pending" | "downloading" | "complete" | "error";
  progress: number;
  fileName: string;
  error?: string;
}

export const UrlUpload = ({ onFileDownloaded, disabled }: UrlUploadProps) => {
  const [urlInput, setUrlInput] = useState("");
  const [downloads, setDownloads] = useState<DownloadState[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const extractFileName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split("/").pop() || "file";
      // If no extension, try to guess from URL or use generic name
      if (!fileName.includes(".")) {
        return `downloaded-file-${Date.now()}`;
      }
      return decodeURIComponent(fileName);
    } catch {
      return `file-${Date.now()}`;
    }
  };

  const getMimeType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      zip: "application/zip",
      mp3: "audio/mpeg",
      wav: "audio/wav",
    };
    return mimeTypes[ext] || "application/octet-stream";
  };

  const downloadFromUrl = async (url: string): Promise<File | null> => {
    const fileName = extractFileName(url);
    
    setDownloads(prev => [...prev, {
      url,
      status: "downloading",
      progress: 0,
      fileName,
    }]);

    try {
      const response = await fetch(url, {
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`שגיאה בהורדה: ${response.status}`);
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("לא ניתן לקרוא את התגובה");
      }

      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        const progress = total > 0 ? Math.round((loaded / total) * 100) : 50;
        setDownloads(prev => prev.map(d => 
          d.url === url ? { ...d, progress } : d
        ));
      }

      const blob = new Blob(chunks as BlobPart[], { type: getMimeType(fileName) });
      const file = new File([blob], fileName, { type: blob.type });

      setDownloads(prev => prev.map(d => 
        d.url === url ? { ...d, status: "complete", progress: 100 } : d
      ));

      return file;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "שגיאה בהורדה";
      setDownloads(prev => prev.map(d => 
        d.url === url ? { ...d, status: "error", error: errorMessage } : d
      ));
      return null;
    }
  };

  const handleAddUrl = async () => {
    const url = urlInput.trim();
    
    if (!url) {
      toast.error("יש להזין קישור");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      // Try adding https://
      try {
        new URL(`https://${url}`);
        setUrlInput(`https://${url}`);
      } catch {
        toast.error("קישור לא תקין");
        return;
      }
    }

    const finalUrl = url.startsWith("http") ? url : `https://${url}`;
    
    // Check if already in list
    if (downloads.some(d => d.url === finalUrl)) {
      toast.error("הקישור כבר נוסף");
      return;
    }

    setIsDownloading(true);
    
    const file = await downloadFromUrl(finalUrl);
    
    if (file) {
      await onFileDownloaded(file);
      toast.success(`הקובץ "${file.name}" נוסף בהצלחה`);
    }
    
    setIsDownloading(false);
    setUrlInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isDownloading) {
      handleAddUrl();
    }
  };

  const removeDownload = (url: string) => {
    setDownloads(prev => prev.filter(d => d.url !== url));
  };

  const retryDownload = async (url: string) => {
    setDownloads(prev => prev.filter(d => d.url !== url));
    setIsDownloading(true);
    
    const file = await downloadFromUrl(url);
    
    if (file) {
      await onFileDownloaded(file);
      toast.success(`הקובץ "${file.name}" נוסף בהצלחה`);
    }
    
    setIsDownloading(false);
  };

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-5 h-5 text-primary" />
        <h4 className="font-semibold">הורדה מקישור</h4>
      </div>
      
      <div className="flex gap-2">
        <Input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="הדבק קישור לקובץ (וידאו, תמונה, מסמך...)"
          className="flex-1 bg-secondary border-border"
          disabled={disabled || isDownloading}
          dir="ltr"
        />
        <Button
          variant="hero"
          onClick={handleAddUrl}
          disabled={disabled || isDownloading || !urlInput.trim()}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" />
              הורד
            </>
          )}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        הדבק קישור ישיר לקובץ • תומך בקישורים מ-Google Drive, Dropbox, ושרתים אחרים
      </p>

      {/* Download Progress List */}
      {downloads.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          {downloads.map((download) => (
            <div
              key={download.url}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                download.status === "error" ? "bg-destructive/5" : "bg-secondary/30"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                {download.status === "downloading" && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                {download.status === "complete" && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
                {download.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{download.fileName}</p>
                {download.status === "downloading" && (
                  <Progress value={download.progress} className="mt-1 h-1" />
                )}
                {download.status === "error" && (
                  <p className="text-xs text-destructive">{download.error}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {download.status === "downloading" && (
                  <span className="text-xs text-muted-foreground">{download.progress}%</span>
                )}
                {download.status === "error" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => retryDownload(download.url)}
                  >
                    נסה שוב
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeDownload(download.url)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
