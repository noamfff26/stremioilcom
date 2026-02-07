import { useState, useCallback } from "react";
import { Upload, Cloud, Video, FileVideo, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UploadedFile {
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
}

const categories = ["הדרכה", "ישיבות", "מוצר", "וובינר", "דוחות", "כללי"];

export const UploadSection = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("כללי");
  const [isUploading, setIsUploading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith("video/")
    );
    
    addFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith("video/")
      );
      addFiles(files);
    }
  };

  const addFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "pending"
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Auto-fill title if empty
    if (!title && files.length > 0) {
      setTitle(files[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadToStorage = async (file: File, fileIndex: number): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Update progress
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[fileIndex] = { ...newFiles[fileIndex], status: "uploading", progress: 10 };
      return newFiles;
    });

    const { data, error } = await supabase.storage
      .from("videos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[fileIndex] = { ...newFiles[fileIndex], status: "error", progress: 0 };
        return newFiles;
      });
      return null;
    }

    // Update progress to complete
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[fileIndex] = { ...newFiles[fileIndex], status: "complete", progress: 100 };
      return newFiles;
    });

    // Get public URL
    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration));
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי להעלות סרטונים");
      navigate("/auth");
      return;
    }

    if (uploadedFiles.length === 0) {
      toast.error("יש לבחור קובץ להעלאה");
      return;
    }

    if (!title.trim()) {
      toast.error("יש להזין כותרת לסרטון");
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        
        // Upload to storage
        const videoUrl = await uploadToStorage(uploadedFile.file, i);
        
        if (!videoUrl) {
          toast.error(`שגיאה בהעלאת ${uploadedFile.file.name}`);
          continue;
        }

        // Get video duration
        const durationSeconds = await getVideoDuration(uploadedFile.file);

        // Save to database
        const { error: dbError } = await supabase.from("videos").insert({
          user_id: user.id,
          title: uploadedFiles.length === 1 ? title : `${title} - חלק ${i + 1}`,
          description,
          category,
          video_url: videoUrl,
          duration_seconds: durationSeconds,
        });

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`שגיאה בשמירת ${uploadedFile.file.name}`);
        }
      }

      toast.success("הסרטונים הועלו בהצלחה!");
      
      // Reset form
      setUploadedFiles([]);
      setTitle("");
      setDescription("");
      setCategory("כללי");
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("אירעה שגיאה בהעלאה");
    } finally {
      setIsUploading(false);
    }
  };

  const features = [
    { icon: Cloud, title: "סנכרון עם SharePoint", desc: "העלאה ישירה לאחסון הארגוני" },
    { icon: Video, title: "תמיכה בכל הפורמטים", desc: "MP4, MOV, AVI, WebM ועוד" },
    { icon: CheckCircle2, title: "ללא הגבלת גודל", desc: "העלה קבצים בכל גודל" },
  ];

  return (
    <section id="upload" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient">העלה תוכן חדש</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              גרור ושחרר קבצי וידאו או לחץ לבחירה - ללא הגבלת גודל
            </p>
          </div>

          {/* Upload Form */}
          <div className="space-y-6">
            {/* Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer
                ${isDragging 
                  ? 'border-primary bg-primary/10 scale-[1.02]' 
                  : 'border-border hover:border-primary/50 bg-card'
                }`}
            >
              {/* Animated Background */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                {/* Upload Icon */}
                <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all duration-300 ${isDragging ? 'gradient-primary glow-primary scale-110' : 'bg-secondary'}`}>
                  <FileVideo className={`w-10 h-10 transition-colors ${isDragging ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>

                {/* Text */}
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {isDragging ? 'שחרר כאן להעלאה' : 'גרור קבצי וידאו לכאן'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  או לחץ לבחירת קבצים מהמחשב
                </p>

                {/* Upload Button */}
                <label>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="hero" size="lg" asChild>
                    <span>
                      <Upload className="w-5 h-5" />
                      בחר קבצים להעלאה
                    </span>
                  </Button>
                </label>

                {/* Supported Formats */}
                <p className="text-sm text-muted-foreground mt-4">
                  פורמטים נתמכים: MP4, MOV, AVI, WebM, MKV • ללא הגבלת גודל
                </p>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">קבצים שנבחרו ({uploadedFiles.length})</h4>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                    <video 
                      src={file.preview} 
                      className="w-20 h-14 object-cover rounded-lg bg-secondary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.file.size)}</p>
                      {file.status === "uploading" && (
                        <Progress value={file.progress} className="mt-2 h-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === "complete" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {file.status === "uploading" && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                      {file.status === "pending" && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Video Details Form */}
            {uploadedFiles.length > 0 && (
              <div className="gradient-card rounded-xl border border-border p-6 space-y-4">
                <h4 className="font-semibold mb-4">פרטי הסרטון</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="הזן כותרת לסרטון"
                    className="bg-secondary border-border"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור (אופציונלי)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="הוסף תיאור לסרטון..."
                    className="bg-secondary border-border min-h-[100px]"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>קטגוריה</Label>
                  <Select value={category} onValueChange={setCategory} disabled={isUploading}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="hero" 
                  size="lg" 
                  className="w-full mt-4"
                  onClick={handleUpload}
                  disabled={isUploading || !title.trim()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      מעלה...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      העלה {uploadedFiles.length} סרטונים
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl gradient-card border border-border hover:border-primary/30 transition-all duration-300 text-center animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
