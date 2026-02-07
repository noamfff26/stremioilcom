import { useState, useRef } from "react";
import { Subtitles, Upload, X, FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubtitleFile {
  id: string;
  file: File;
  label: string;
  language: string;
  status: "pending" | "uploading" | "complete" | "error";
}

interface SubtitleUploadProps {
  videoId: string;
  onSubtitlesUploaded?: (subtitles: { label: string; src: string; language: string }[]) => void;
}

const languages = [
  { code: "he", name: "עברית" },
  { code: "en", name: "אנגלית" },
  { code: "ar", name: "ערבית" },
  { code: "ru", name: "רוסית" },
  { code: "fr", name: "צרפתית" },
  { code: "es", name: "ספרדית" },
  { code: "de", name: "גרמנית" },
];

export const SubtitleUpload = ({ videoId, onSubtitlesUploaded }: SubtitleUploadProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [subtitleFiles, setSubtitleFiles] = useState<SubtitleFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles = files.filter(file => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ext === "srt" || ext === "vtt" || ext === "ass" || ext === "ssa";
    });

    if (validFiles.length !== files.length) {
      toast.error("יש להעלות קבצי כתוביות בלבד (SRT, VTT, ASS)");
    }

    const newSubtitles: SubtitleFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      label: file.name.replace(/\.[^/.]+$/, ""),
      language: "he", // Default to Hebrew
      status: "pending",
    }));

    setSubtitleFiles(prev => [...prev, ...newSubtitles]);
  };

  const updateSubtitle = (id: string, updates: Partial<SubtitleFile>) => {
    setSubtitleFiles(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const removeSubtitle = (id: string) => {
    setSubtitleFiles(prev => prev.filter(s => s.id !== id));
  };

  const uploadSubtitles = async () => {
    if (!user || subtitleFiles.length === 0) return;

    setIsUploading(true);
    const uploadedSubtitles: { label: string; src: string; language: string }[] = [];

    for (const subtitle of subtitleFiles) {
      updateSubtitle(subtitle.id, { status: "uploading" });

      try {
        const fileExt = subtitle.file.name.split(".").pop();
        const fileName = `subtitles/${user.id}/${videoId}/${subtitle.language}-${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("videos")
          .upload(fileName, subtitle.file, { cacheControl: "3600" });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("videos")
          .getPublicUrl(data.path);

        uploadedSubtitles.push({
          label: subtitle.label,
          src: urlData.publicUrl,
          language: subtitle.language,
        });

        updateSubtitle(subtitle.id, { status: "complete" });
      } catch (error) {
        console.error("Error uploading subtitle:", error);
        updateSubtitle(subtitle.id, { status: "error" });
      }
    }

    if (uploadedSubtitles.length > 0) {
      onSubtitlesUploaded?.(uploadedSubtitles);
      toast.success(`${uploadedSubtitles.length} כתוביות הועלו בהצלחה`);
    }

    setIsUploading(false);

    // Clear completed uploads after delay
    setTimeout(() => {
      setSubtitleFiles(prev => prev.filter(s => s.status !== "complete"));
      if (subtitleFiles.every(s => s.status === "complete")) {
        setIsOpen(false);
      }
    }, 1500);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Subtitles className="w-4 h-4" />
        העלה כתוביות
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Subtitles className="w-5 h-5 text-primary" />
              העלאת כתוביות
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                לחץ לבחירת קבצי כתוביות
              </p>
              <p className="text-xs text-muted-foreground">
                נתמכים: SRT, VTT, ASS, SSA
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.ass,.ssa"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Subtitle Files List */}
            {subtitleFiles.length > 0 && (
              <div className="space-y-3">
                <Label>קבצי כתוביות ({subtitleFiles.length})</Label>
                {subtitleFiles.map((subtitle) => (
                  <div
                    key={subtitle.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {subtitle.status === "uploading" ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : subtitle.status === "complete" ? (
                        <Check className="w-5 h-5 text-primary" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <Input
                        value={subtitle.label}
                        onChange={(e) => updateSubtitle(subtitle.id, { label: e.target.value })}
                        placeholder="תווית הכתוביות"
                        className="h-8 text-sm bg-background"
                        disabled={subtitle.status !== "pending"}
                      />
                      <Select
                        value={subtitle.language}
                        onValueChange={(v) => updateSubtitle(subtitle.id, { language: v })}
                        disabled={subtitle.status !== "pending"}
                      >
                        <SelectTrigger className="h-8 text-sm bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {subtitle.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => removeSubtitle(subtitle.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <strong>טיפ:</strong> הכתוביות תומכות בטקסט עברי מימין לשמאל (RTL) באופן אוטומטי. 
                ניתן להתאים את מראה הכתוביות בזמן הצפייה דרך כפתור הכתוביות בנגן.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              ביטול
            </Button>
            <Button
              variant="hero"
              onClick={uploadSubtitles}
              disabled={subtitleFiles.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מעלה...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  העלה כתוביות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
