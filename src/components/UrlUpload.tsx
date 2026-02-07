import { useState } from "react";
import { Link2, Loader2, Download, X, CheckCircle2, AlertCircle, Youtube, Plus, FileVideo, FileImage, FileText, File, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "./VideoPlayer";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface UrlUploadProps {
  onFileDownloaded: (file: File) => Promise<void>;
  disabled?: boolean;
}

interface DownloadState {
  id: string;
  url: string;
  status: "pending" | "downloading" | "complete" | "error";
  progress: number;
  fileName: string;
  error?: string;
  type: "direct" | "youtube" | "vimeo";
  isVideo?: boolean;
}

export const UrlUpload = ({ onFileDownloaded, disabled }: UrlUploadProps) => {
  const [urlInput, setUrlInput] = useState("");
  const [downloads, setDownloads] = useState<DownloadState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMultiInput, setShowMultiInput] = useState(false);
  const [multiUrlInput, setMultiUrlInput] = useState("");
  const [streamingUrl, setStreamingUrl] = useState<{ url: string; title: string } | null>(null);

  const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv", "m4v", "flv", "wmv", "ts", "m3u8"];

  const isVideoUrl = (fileName: string): boolean => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return VIDEO_EXTENSIONS.includes(ext);
  };
  const extractFileName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split("/").pop() || "file";
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
      // Video
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      m4v: "video/x-m4v",
      flv: "video/x-flv",
      wmv: "video/x-ms-wmv",
      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      ico: "image/x-icon",
      tiff: "image/tiff",
      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      csv: "text/csv",
      json: "application/json",
      xml: "application/xml",
      // Archives
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      tar: "application/x-tar",
      gz: "application/gzip",
      // Audio
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
      flac: "audio/flac",
      aac: "audio/aac",
    };
    return mimeTypes[ext] || "application/octet-stream";
  };

  const detectUrlType = (url: string): "direct" | "youtube" | "vimeo" => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
      return "youtube";
    }
    if (lowerUrl.includes("vimeo.com")) {
      return "vimeo";
    }
    return "direct";
  };

  const getFileIcon = (fileName: string, type: string) => {
    if (type === "youtube") return <Youtube className="w-4 h-4 text-red-500" />;
    if (type === "vimeo") return <FileVideo className="w-4 h-4 text-sky-500" />;
    
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const videoExts = ["mp4", "webm", "mov", "avi", "mkv", "m4v", "flv", "wmv"];
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "tiff"];
    const docExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"];
    
    if (videoExts.includes(ext)) return <FileVideo className="w-4 h-4 text-primary" />;
    if (imageExts.includes(ext)) return <FileImage className="w-4 h-4 text-emerald-500" />;
    if (docExts.includes(ext)) return <FileText className="w-4 h-4 text-sky-500" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  // Download via proxy (for CORS-restricted URLs)
  const downloadViaProxy = async (id: string, url: string): Promise<File | null> => {
    const fileName = extractFileName(url);
    
    try {
      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: "downloading", progress: 10 } : d
      ));

      const { data, error } = await supabase.functions.invoke('proxy-download', {
        body: { url },
      });

      if (error) {
        throw new Error(error.message || 'שגיאה בהורדה דרך הפרוקסי');
      }

      // The response is the file blob
      const blob = data as Blob;
      
      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, progress: 90 } : d
      ));

      const mimeType = getMimeType(fileName);
      const file = Object.assign(new Blob([blob], { type: mimeType }), { 
        name: fileName, 
        lastModified: Date.now() 
      }) as unknown as File;

      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: "complete", progress: 100 } : d
      ));

      return file;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "שגיאה בהורדה";
      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: "error", error: errorMessage } : d
      ));
      return null;
    }
  };

  const downloadDirectUrl = async (id: string, url: string): Promise<File | null> => {
    const fileName = extractFileName(url);
    
    try {
      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: "downloading", progress: 5 } : d
      ));

      // Try direct fetch first
      let response: Response;
      try {
        response = await fetch(url, { mode: "cors" });
        if (!response.ok) {
          throw new Error(`שגיאה: ${response.status}`);
        }
      } catch (corsError) {
        // If CORS fails, try via proxy
        console.log("Direct fetch failed, trying proxy...", corsError);
        setDownloads(prev => prev.map(d => 
          d.id === id ? { ...d, progress: 5, error: undefined } : d
        ));
        return await downloadViaProxy(id, url);
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("לא ניתן לקרוא את התגובה");
      }

      const chunks: BlobPart[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        const progress = total > 0 ? Math.min(95, Math.round((loaded / total) * 100)) : 50;
        setDownloads(prev => prev.map(d => 
          d.id === id ? { ...d, progress } : d
        ));
      }

      const mimeType = getMimeType(fileName);
      const blob = new Blob(chunks, { type: mimeType });
      const file = Object.assign(blob, { 
        name: fileName, 
        lastModified: Date.now() 
      }) as unknown as File;

      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: "complete", progress: 100 } : d
      ));

      return file;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "שגיאה בהורדה";
      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: "error", error: errorMessage } : d
      ));
      return null;
    }
  };

  const processUrl = async (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // Validate URL
    let finalUrl = trimmedUrl;
    try {
      new URL(trimmedUrl);
    } catch {
      try {
        new URL(`https://${trimmedUrl}`);
        finalUrl = `https://${trimmedUrl}`;
      } catch {
        toast.error(`קישור לא תקין: ${trimmedUrl}`);
        return;
      }
    }

    if (!finalUrl.startsWith("http")) {
      finalUrl = `https://${finalUrl}`;
    }

    // Check if already exists
    if (downloads.some(d => d.url === finalUrl)) {
      toast.error("הקישור כבר נוסף");
      return;
    }

    const type = detectUrlType(finalUrl);
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // For YouTube/Vimeo, show helpful message with alternatives
    if (type === "youtube" || type === "vimeo") {
      const platformName = type === "youtube" ? "YouTube" : "Vimeo";
      toast.info(
        `הורדה מ-${platformName} אינה נתמכת עקב מגבלות זכויות יוצרים. טיפ: השתמש בשירות חיצוני כמו y2mate.com להורדה, ואז העלה את הקובץ ישירות.`,
        { 
          duration: 8000,
          icon: type === "youtube" ? <Youtube className="w-5 h-5 text-red-500" /> : undefined
        }
      );
      return;
    }

    const fileName = extractFileName(finalUrl);
    const isVideo = isVideoUrl(fileName);

    setDownloads(prev => [...prev, {
      id,
      url: finalUrl,
      status: "pending",
      progress: 0,
      fileName,
      type,
      isVideo,
    }]);

    // If it's a video, don't auto-download - let user choose to stream or download
    if (isVideo) {
      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: "complete", progress: 100 } : d
      ));
      toast.success(`זוהה קישור וידאו: "${fileName}"`, {
        description: "אפשר לצפות ישירות או להוריד לאחסון",
      });
      return;
    }

    const file = await downloadDirectUrl(id, finalUrl);

    if (file) {
      await onFileDownloaded(file);
      toast.success(`הקובץ "${file.name}" נוסף בהצלחה`);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) {
      toast.error("יש להזין קישור");
      return;
    }

    setIsProcessing(true);
    await processUrl(urlInput);
    setIsProcessing(false);
    setUrlInput("");
  };

  const handleAddMultipleUrls = async () => {
    const urls = multiUrlInput
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      toast.error("יש להזין לפחות קישור אחד");
      return;
    }

    toast.success(`מעבד ${urls.length} קישורים...`);
    setIsProcessing(true);

    for (const url of urls) {
      await processUrl(url);
    }

    setIsProcessing(false);
    setMultiUrlInput("");
    setShowMultiInput(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isProcessing) {
      handleAddUrl();
    }
  };

  const removeDownload = (id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  };

  const retryDownload = async (download: DownloadState) => {
    setDownloads(prev => prev.filter(d => d.id !== download.id));
    await processUrl(download.url);
  };

  const handleDownloadVideo = async (download: DownloadState) => {
    const file = await downloadDirectUrl(download.id, download.url);
    if (file) {
      await onFileDownloaded(file);
      toast.success(`הקובץ "${file.name}" נוסף בהצלחה`);
    }
  };

  const handleStreamVideo = (download: DownloadState) => {
    setStreamingUrl({ 
      url: download.url, 
      title: download.fileName 
    });
  };

  return (
    <>
    <div className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">הורדה מקישור</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMultiInput(!showMultiInput)}
          className="text-xs"
        >
          <Plus className="w-3 h-3 ml-1" />
          {showMultiInput ? "קישור בודד" : "מספר קישורים"}
        </Button>
      </div>

      {showMultiInput ? (
        // Multiple URLs input
        <div className="space-y-3">
          <Textarea
            value={multiUrlInput}
            onChange={(e) => setMultiUrlInput(e.target.value)}
            placeholder={"הדבק מספר קישורים, כל קישור בשורה נפרדת...\nhttps://example.com/video1.mp4\nhttps://example.com/image.jpg\nhttps://example.com/document.pdf"}
            className="min-h-[120px] bg-secondary border-border resize-none"
            disabled={disabled || isProcessing}
            dir="ltr"
          />
          <div className="flex gap-2">
            <Button
              variant="hero"
              onClick={handleAddMultipleUrls}
              disabled={disabled || isProcessing || !multiUrlInput.trim()}
              className="flex-1"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  הורד את כל הקישורים
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        // Single URL input
        <div className="flex gap-2">
          <Input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="הדבק קישור ישיר לקובץ (וידאו, תמונה, מסמך...)"
            className="flex-1 bg-secondary border-border"
            disabled={disabled || isProcessing}
            dir="ltr"
          />
          <Button
            variant="hero"
            onClick={handleAddUrl}
            disabled={disabled || isProcessing || !urlInput.trim()}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                הורד
              </>
            )}
          </Button>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        הדבק קישור ישיר לקובץ • תומך בווידאו, תמונות, מסמכים וקבצים אחרים
      </p>

      {/* Download Progress List */}
      {downloads.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          {downloads.map((download) => (
            <div
              key={download.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                download.status === "error" ? "bg-destructive/5" : "bg-secondary/30"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                {download.status === "downloading" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : download.status === "complete" ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : download.status === "error" ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  getFileIcon(download.fileName, download.type)
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{download.fileName}</p>
                {download.status === "downloading" && (
                  <>
                    <Progress value={download.progress} className="mt-1 h-1" />
                    <p className="text-xs text-muted-foreground mt-0.5">מוריד...</p>
                  </>
                )}
                {download.status === "error" && (
                  <p className="text-xs text-destructive">{download.error}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {download.status === "downloading" && (
                  <span className="text-xs text-muted-foreground">{download.progress}%</span>
                )}
                {download.status === "complete" && download.isVideo && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStreamVideo(download)}
                      className="text-primary"
                    >
                      <Play className="w-4 h-4 ml-1" />
                      צפה
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadVideo(download)}
                    >
                      <Download className="w-4 h-4 ml-1" />
                      הורד
                    </Button>
                  </>
                )}
                {download.status === "error" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => retryDownload(download)}
                  >
                    נסה שוב
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeDownload(download.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Video Streaming Dialog */}
    <Dialog open={!!streamingUrl} onOpenChange={() => setStreamingUrl(null)}>
      <DialogContent className="max-w-5xl p-0 bg-black border-none">
        {streamingUrl && (
          <VideoPlayer
            src={streamingUrl.url}
            title={streamingUrl.title}
            onClose={() => setStreamingUrl(null)}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
