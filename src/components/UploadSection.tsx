import { useState, useCallback, useRef } from "react";
import { Upload, Cloud, Video, FileVideo, CheckCircle2, X, Loader2, AlertCircle, FolderOpen } from "lucide-react";
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
  thumbnail: string | null;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  errorMessage?: string;
  duration?: number;
}

const categories = ["הדרכה", "ישיבות", "מוצר", "וובינר", "דוחות", "כללי"];

export const UploadSection = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("כללי");
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
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
    
    // Handle both files and folders via DataTransferItemList
    const items = e.dataTransfer.items;
    const filePromises: Promise<File[]>[] = [];

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            filePromises.push(traverseFileTree(entry));
          } else {
            const file = item.getAsFile();
            if (file && file.type.startsWith("video/")) {
              filePromises.push(Promise.resolve([file]));
            }
          }
        }
      }
    }

    Promise.all(filePromises).then((fileArrays) => {
      const allFiles = fileArrays.flat().filter(file => file.type.startsWith("video/"));
      if (allFiles.length === 0) {
        toast.error("יש לבחור קבצי וידאו בלבד");
        return;
      }
      addFiles(allFiles);
    });
  }, []);

  // Recursively traverse folder entries
  const traverseFileTree = (entry: FileSystemEntry): Promise<File[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file((file) => {
          resolve([file]);
        }, () => resolve([]));
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const allEntries: FileSystemEntry[] = [];
        
        const readEntries = () => {
          dirReader.readEntries((entries) => {
            if (entries.length === 0) {
              Promise.all(allEntries.map(traverseFileTree)).then((results) => {
                resolve(results.flat());
              });
            } else {
              allEntries.push(...entries);
              readEntries();
            }
          }, () => resolve([]));
        };
        
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith("video/")
      );
      if (files.length > 0) {
        addFiles(files);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith("video/")
      );
      if (files.length > 0) {
        addFiles(files);
        toast.success(`נמצאו ${files.length} סרטונים בתיקייה`);
      } else {
        toast.error("לא נמצאו קבצי וידאו בתיקייה");
      }
    }
    // Reset input
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const generateThumbnail = (file: File): Promise<{ thumbnail: string; duration: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        // Seek to 25% of video for better thumbnail
        video.currentTime = video.duration * 0.25;
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const thumbnail = canvas.toDataURL("image/jpeg", 0.8);
        const duration = Math.floor(video.duration);
        
        URL.revokeObjectURL(video.src);
        resolve({ thumbnail, duration });
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({ thumbnail: "", duration: 0 });
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const addFiles = async (files: File[]) => {
    const newFiles: UploadedFile[] = [];
    
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const { thumbnail, duration } = await generateThumbnail(file);
      
      newFiles.push({
        file,
        preview,
        thumbnail,
        progress: 0,
        status: "pending",
        duration,
      });
    }
    
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

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const uploadThumbnailToStorage = async (thumbnailDataUrl: string, userId: string): Promise<string | null> => {
    try {
      // Convert data URL to blob
      const response = await fetch(thumbnailDataUrl);
      const blob = await response.blob();
      
      const fileName = `${userId}/thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error } = await supabase.storage
        .from("videos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (error) {
        console.error("Thumbnail upload error:", error);
        return null;
      }

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Thumbnail processing error:", error);
      return null;
    }
  };

  const uploadToStorage = async (file: File, fileIndex: number): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Update status to uploading
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[fileIndex] = { ...newFiles[fileIndex], status: "uploading", progress: 5 };
      return newFiles;
    });

    try {
      // For progress simulation since supabase-js doesn't support upload progress directly
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => {
          const newFiles = [...prev];
          if (newFiles[fileIndex] && newFiles[fileIndex].status === "uploading") {
            const currentProgress = newFiles[fileIndex].progress;
            // Slowly increase to 90%
            if (currentProgress < 90) {
              newFiles[fileIndex] = { 
                ...newFiles[fileIndex], 
                progress: Math.min(90, currentProgress + Math.random() * 10) 
              };
            }
          }
          return newFiles;
        });
      }, 500);

      const { data, error } = await supabase.storage
        .from("videos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        console.error("Upload error:", error);
        setUploadedFiles(prev => {
          const newFiles = [...prev];
          newFiles[fileIndex] = { 
            ...newFiles[fileIndex], 
            status: "error", 
            progress: 0,
            errorMessage: error.message 
          };
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
    } catch (error) {
      console.error("Upload exception:", error);
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[fileIndex] = { 
          ...newFiles[fileIndex], 
          status: "error", 
          progress: 0,
          errorMessage: "שגיאה בהעלאה" 
        };
        return newFiles;
      });
      return null;
    }
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
    setOverallProgress(0);

    let successCount = 0;

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        
        // Update overall progress
        setOverallProgress(Math.round((i / uploadedFiles.length) * 100));
        
        // Upload video to storage
        const videoUrl = await uploadToStorage(uploadedFile.file, i);
        
        if (!videoUrl) {
          toast.error(`שגיאה בהעלאת ${uploadedFile.file.name}`);
          continue;
        }

        // Upload thumbnail if available
        let thumbnailUrl: string | null = null;
        if (uploadedFile.thumbnail) {
          thumbnailUrl = await uploadThumbnailToStorage(uploadedFile.thumbnail, user.id);
        }

        // Save to database
        const { error: dbError } = await supabase.from("videos").insert({
          user_id: user.id,
          title: uploadedFiles.length === 1 ? title : `${title} - חלק ${i + 1}`,
          description,
          category,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          duration_seconds: uploadedFile.duration || 0,
        });

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`שגיאה בשמירת ${uploadedFile.file.name}`);
        } else {
          successCount++;
        }
      }

      setOverallProgress(100);

      if (successCount > 0) {
        toast.success(`${successCount} סרטונים הועלו בהצלחה!`);
        
        // Reset form
        setUploadedFiles([]);
        setTitle("");
        setDescription("");
        setCategory("כללי");
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("אירעה שגיאה בהעלאה");
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
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

          {/* Not logged in warning */}
          {!user && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-foreground">יש להתחבר כדי להעלות סרטונים</p>
              </div>
              <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                התחבר עכשיו
              </Button>
            </div>
          )}

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

                {/* Upload Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button variant="hero" size="lg" asChild>
                      <span>
                        <Upload className="w-5 h-5" />
                        בחר קבצים
                      </span>
                    </Button>
                  </label>
                  
                  <label>
                    <input
                      ref={folderInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFolderSelect}
                      className="hidden"
                      {...{ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>}
                    />
                    <Button variant="glass" size="lg" asChild>
                      <span>
                        <FolderOpen className="w-5 h-5" />
                        העלה תיקייה
                      </span>
                    </Button>
                  </label>
                </div>

                {/* Supported Formats */}
                <p className="text-sm text-muted-foreground mt-4">
                  פורמטים נתמכים: MP4, MOV, AVI, WebM, MKV • ללא הגבלת גודל • גרור תיקייה להעלאה
                </p>
              </div>
            </div>

            {/* Overall Progress */}
            {isUploading && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">התקדמות כללית</span>
                  <span className="text-sm text-muted-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">קבצים שנבחרו ({uploadedFiles.length})</h4>
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-colors ${
                      file.status === "error" ? "border-destructive/50" : "border-border"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                      {file.thumbnail ? (
                        <img 
                          src={file.thumbnail} 
                          alt="תצוגה מקדימה"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video 
                          src={file.preview} 
                          className="w-full h-full object-cover"
                        />
                      )}
                      {file.duration && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-background/80 text-xs">
                          {formatDuration(file.duration)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.file.size)}</p>
                      {file.status === "uploading" && (
                        <Progress value={file.progress} className="mt-2 h-1" />
                      )}
                      {file.status === "error" && file.errorMessage && (
                        <p className="text-sm text-destructive mt-1">{file.errorMessage}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.status === "complete" && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>הועלה</span>
                        </div>
                      )}
                      {file.status === "uploading" && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span>{Math.round(file.progress)}%</span>
                        </div>
                      )}
                      {file.status === "error" && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                      {(file.status === "pending" || file.status === "error") && (
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
                  <Label htmlFor="title">כותרת *</Label>
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
                  disabled={isUploading || !title.trim() || !user}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      מעלה... {overallProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      העלה {uploadedFiles.length} {uploadedFiles.length === 1 ? "סרטון" : "סרטונים"}
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
