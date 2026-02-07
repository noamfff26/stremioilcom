import { useState, useCallback, useRef, useMemo } from "react";
import { Upload, Cloud, Video, FileVideo, CheckCircle2, X, Loader2, AlertCircle, FolderOpen, File, FileImage, FileText, ChevronDown, ChevronLeft } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface UploadedFile {
  file: File;
  preview: string;
  thumbnail: string | null;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  errorMessage?: string;
  duration?: number;
  fileType: "video" | "image" | "document" | "other";
  relativePath: string; // Path relative to upload root
  folderPath: string; // Folder path only (without filename)
}

interface FolderNode {
  name: string;
  path: string;
  files: UploadedFile[];
  subfolders: Map<string, FolderNode>;
  isOpen: boolean;
  progress: number;
  status: "pending" | "uploading" | "complete" | "partial" | "error";
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Build folder tree from files
  const folderTree = useMemo(() => {
    const root: FolderNode = {
      name: "קבצים",
      path: "",
      files: [],
      subfolders: new Map(),
      isOpen: true,
      progress: 0,
      status: "pending"
    };

    for (const file of uploadedFiles) {
      const pathParts = file.folderPath.split("/").filter(Boolean);
      let currentNode = root;

      // Navigate/create folder structure
      for (let i = 0; i < pathParts.length; i++) {
        const folderName = pathParts[i];
        const folderPath = pathParts.slice(0, i + 1).join("/");
        
        if (!currentNode.subfolders.has(folderName)) {
          currentNode.subfolders.set(folderName, {
            name: folderName,
            path: folderPath,
            files: [],
            subfolders: new Map(),
            isOpen: expandedFolders.has(folderPath),
            progress: 0,
            status: "pending"
          });
        }
        currentNode = currentNode.subfolders.get(folderName)!;
      }

      // Add file to appropriate folder
      if (pathParts.length === 0) {
        root.files.push(file);
      } else {
        currentNode.files.push(file);
      }
    }

    // Calculate folder statuses
    const calculateFolderStatus = (node: FolderNode): void => {
      const allFiles: UploadedFile[] = [];
      const collectFiles = (n: FolderNode) => {
        allFiles.push(...n.files);
        n.subfolders.forEach(sub => collectFiles(sub));
      };
      collectFiles(node);

      if (allFiles.length === 0) {
        node.status = "pending";
        node.progress = 0;
        return;
      }

      const totalProgress = allFiles.reduce((sum, f) => sum + f.progress, 0);
      node.progress = Math.round(totalProgress / allFiles.length);

      const statuses = allFiles.map(f => f.status);
      if (statuses.every(s => s === "complete")) {
        node.status = "complete";
      } else if (statuses.every(s => s === "pending")) {
        node.status = "pending";
      } else if (statuses.some(s => s === "error")) {
        node.status = statuses.every(s => s === "error") ? "error" : "partial";
      } else if (statuses.some(s => s === "uploading")) {
        node.status = "uploading";
      } else {
        node.status = "partial";
      }

      node.subfolders.forEach(sub => calculateFolderStatus(sub));
    };

    calculateFolderStatus(root);
    return root;
  }, [uploadedFiles, expandedFolders]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const hasSubfolders = uploadedFiles.some(f => f.folderPath.length > 0);

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
    
    const items = e.dataTransfer.items;
    const filePromises: Promise<{ file: File; path: string }[]>[] = [];

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            filePromises.push(traverseFileTree(entry, ""));
          } else {
            const file = item.getAsFile();
            if (file) {
              filePromises.push(Promise.resolve([{ file, path: "" }]));
            }
          }
        }
      }
    }

    Promise.all(filePromises).then((fileArrays) => {
      const allFiles = fileArrays.flat();
      if (allFiles.length === 0) {
        toast.error("לא נמצאו קבצים");
        return;
      }
      addFilesWithPaths(allFiles);
    });
  }, []);

  // Recursively traverse folder entries with path tracking
  const traverseFileTree = (entry: FileSystemEntry, basePath: string): Promise<{ file: File; path: string }[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file((file) => {
          resolve([{ file, path: basePath }]);
        }, () => resolve([]));
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const allEntries: FileSystemEntry[] = [];
        const newPath = basePath ? `${basePath}/${entry.name}` : entry.name;
        
        const readEntries = () => {
          dirReader.readEntries((entries) => {
            if (entries.length === 0) {
              Promise.all(allEntries.map(e => traverseFileTree(e, newPath))).then((results) => {
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
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        addFilesWithPaths(files.map(f => ({ file: f, path: "" })));
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        // Extract folder structure from webkitRelativePath
        const filesWithPaths = files.map(f => {
          const relativePath = (f as any).webkitRelativePath || f.name;
          const pathParts = relativePath.split("/");
          pathParts.pop(); // Remove filename
          return { file: f, path: pathParts.join("/") };
        });
        addFilesWithPaths(filesWithPaths);
        
        // Get root folder name
        const rootFolder = files[0] && (files[0] as any).webkitRelativePath?.split("/")[0];
        toast.success(`נמצאו ${files.length} קבצים בתיקייה "${rootFolder}"`);
      } else {
        toast.error("לא נמצאו קבצים בתיקייה");
      }
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const getFileType = (file: File): "video" | "image" | "document" | "other" => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text") || 
        file.type.includes("spreadsheet") || file.type.includes("presentation")) return "document";
    return "other";
  };

  const getFileIcon = (fileType: "video" | "image" | "document" | "other") => {
    switch (fileType) {
      case "video": return FileVideo;
      case "image": return FileImage;
      case "document": return FileText;
      default: return File;
    }
  };

  const generateThumbnail = (file: File): Promise<{ thumbnail: string; duration: number }> => {
    return new Promise((resolve) => {
      const fileType = getFileType(file);
      
      if (fileType === "image") {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ thumbnail: reader.result as string, duration: 0 });
        };
        reader.onerror = () => resolve({ thumbnail: "", duration: 0 });
        reader.readAsDataURL(file);
        return;
      }
      
      if (fileType !== "video") {
        resolve({ thumbnail: "", duration: 0 });
        return;
      }
      
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
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

  const addFilesWithPaths = async (filesWithPaths: { file: File; path: string }[]) => {
    const newFiles: UploadedFile[] = [];
    
    for (const { file, path } of filesWithPaths) {
      const preview = URL.createObjectURL(file);
      const fileType = getFileType(file);
      const { thumbnail, duration } = await generateThumbnail(file);
      const relativePath = path ? `${path}/${file.name}` : file.name;
      
      newFiles.push({
        file,
        preview,
        thumbnail,
        progress: 0,
        status: "pending",
        duration,
        fileType,
        relativePath,
        folderPath: path,
      });
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Auto-expand all folders
    const allPaths = new Set<string>([""]);
    for (const { path } of filesWithPaths) {
      const parts = path.split("/").filter(Boolean);
      for (let i = 0; i <= parts.length; i++) {
        allPaths.add(parts.slice(0, i).join("/"));
      }
    }
    setExpandedFolders(allPaths);
    
    if (!title && filesWithPaths.length > 0) {
      const rootFolder = filesWithPaths[0].path.split("/")[0];
      setTitle(rootFolder || filesWithPaths[0].file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const removeFile = (relativePath: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.relativePath === relativePath);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.relativePath !== relativePath);
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

  const uploadToStorage = async (file: UploadedFile, fileIndex: number): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    setCurrentUploadingFile(file.relativePath);
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[fileIndex] = { ...newFiles[fileIndex], status: "uploading", progress: 5 };
      return newFiles;
    });

    try {
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => {
          const newFiles = [...prev];
          if (newFiles[fileIndex] && newFiles[fileIndex].status === "uploading") {
            const currentProgress = newFiles[fileIndex].progress;
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
        .upload(fileName, file.file, {
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

      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[fileIndex] = { ...newFiles[fileIndex], status: "complete", progress: 100 };
        return newFiles;
      });

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

  // Create folder in database
  const createFolderInDB = async (folderPath: string, parentId: string | null, createdFolders: Map<string, string>): Promise<string | null> => {
    if (!user) return null;
    
    if (createdFolders.has(folderPath)) {
      return createdFolders.get(folderPath)!;
    }

    const folderName = folderPath.split("/").pop() || folderPath;
    
    const { data, error } = await supabase.from("folders").insert({
      user_id: user.id,
      name: folderName,
      parent_id: parentId,
    }).select().single();

    if (error) {
      console.error("Folder creation error:", error);
      return null;
    }

    createdFolders.set(folderPath, data.id);
    return data.id;
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי להעלות קבצים");
      navigate("/auth");
      return;
    }

    if (uploadedFiles.length === 0) {
      toast.error("יש לבחור קובץ להעלאה");
      return;
    }

    if (!title.trim()) {
      toast.error("יש להזין כותרת");
      return;
    }

    setIsUploading(true);
    setOverallProgress(0);

    let successCount = 0;
    const createdFolders = new Map<string, string>();

    try {
      // First, create all necessary folders
      const uniqueFolderPaths = [...new Set(uploadedFiles.map(f => f.folderPath).filter(Boolean))];
      uniqueFolderPaths.sort((a, b) => a.split("/").length - b.split("/").length);

      for (const folderPath of uniqueFolderPaths) {
        const parts = folderPath.split("/");
        let parentId: string | null = null;
        
        for (let i = 0; i < parts.length; i++) {
          const currentPath = parts.slice(0, i + 1).join("/");
          const folderId = await createFolderInDB(currentPath, parentId, createdFolders);
          if (folderId) {
            parentId = folderId;
          }
        }
      }

      // Then upload files
      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        
        setOverallProgress(Math.round((i / uploadedFiles.length) * 100));
        
        const videoUrl = await uploadToStorage(uploadedFile, i);
        
        if (!videoUrl) {
          toast.error(`שגיאה בהעלאת ${uploadedFile.file.name}`);
          continue;
        }

        let thumbnailUrl: string | null = null;
        if (uploadedFile.thumbnail) {
          thumbnailUrl = await uploadThumbnailToStorage(uploadedFile.thumbnail, user.id);
        }

        // Get folder ID for this file
        const folderId = uploadedFile.folderPath ? createdFolders.get(uploadedFile.folderPath) : null;

        const { error: dbError } = await supabase.from("videos").insert({
          user_id: user.id,
          title: uploadedFile.file.name.replace(/\.[^/.]+$/, ""),
          description: description || null,
          category,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          duration_seconds: uploadedFile.duration || 0,
          folder_id: folderId,
        });

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`שגיאה בשמירת ${uploadedFile.file.name}`);
        } else {
          successCount++;
        }
      }

      setOverallProgress(100);
      setCurrentUploadingFile("");

      if (successCount > 0) {
        toast.success(`${successCount} קבצים הועלו בהצלחה!`);
        
        setUploadedFiles([]);
        setTitle("");
        setDescription("");
        setCategory("כללי");
        setExpandedFolders(new Set([""]));
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("אירעה שגיאה בהעלאה");
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
      setCurrentUploadingFile("");
    }
  };

  const features = [
    { icon: Cloud, title: "סנכרון עם SharePoint", desc: "העלאה ישירה לאחסון הארגוני" },
    { icon: FolderOpen, title: "שמירת מבנה תיקיות", desc: "העלה תיקיות כמו שהן מסודרות" },
    { icon: CheckCircle2, title: "ללא הגבלת גודל", desc: "העלה קבצים בכל גודל" },
  ];

  // Render folder tree recursively
  const renderFolderTree = (node: FolderNode, depth: number = 0) => {
    const hasChildren = node.files.length > 0 || node.subfolders.size > 0;
    const isExpanded = expandedFolders.has(node.path);

    const getStatusColor = () => {
      switch (node.status) {
        case "complete": return "text-primary";
        case "uploading": return "text-blue-500";
        case "error": return "text-destructive";
        case "partial": return "text-yellow-500";
        default: return "text-muted-foreground";
      }
    };

    const getStatusIcon = () => {
      switch (node.status) {
        case "complete": return <CheckCircle2 className="w-4 h-4" />;
        case "uploading": return <Loader2 className="w-4 h-4 animate-spin" />;
        case "error": return <AlertCircle className="w-4 h-4" />;
        default: return null;
      }
    };

    return (
      <div key={node.path || "root"} className="space-y-1">
        {/* Folder header */}
        {(node.path || hasSubfolders) && (
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-secondary/50 ${depth > 0 ? 'mr-4' : ''}`}
            onClick={() => toggleFolder(node.path)}
            style={{ marginRight: depth * 16 }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {hasChildren && (
                isExpanded ? 
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : 
                  <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <FolderOpen className={`w-5 h-5 flex-shrink-0 ${node.status === "complete" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-medium truncate">{node.name || "קבצים"}</span>
              <span className="text-xs text-muted-foreground">
                ({node.files.length + Array.from(node.subfolders.values()).reduce((sum, s) => sum + s.files.length, 0)})
              </span>
            </div>
            
            {/* Folder progress/status */}
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
              {node.status === "uploading" && (
                <span className="text-xs">{node.progress}%</span>
              )}
              {getStatusIcon()}
            </div>
          </div>
        )}

        {/* Folder content */}
        {isExpanded && (
          <div className={depth > 0 ? "mr-4 border-r border-border pr-2" : ""} style={{ marginRight: depth * 16 }}>
            {/* Subfolders */}
            {Array.from(node.subfolders.values()).map(subfolder => renderFolderTree(subfolder, depth + 1))}
            
            {/* Files */}
            {node.files.map((file) => (
              <div 
                key={file.relativePath}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  currentUploadingFile === file.relativePath ? "bg-primary/10 border border-primary/30" : 
                  file.status === "error" ? "bg-destructive/5" : "hover:bg-secondary/30"
                }`}
                style={{ marginRight: (depth + 1) * 16 }}
              >
                {/* File icon/thumbnail */}
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (() => {
                      const IconComponent = getFileIcon(file.fileType);
                      return <IconComponent className="w-5 h-5 text-muted-foreground" />;
                    })()
                  )}
                </div>
                
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file.size)}</span>
                    {file.duration && file.duration > 0 && (
                      <span>• {formatDuration(file.duration)}</span>
                    )}
                  </div>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="mt-1 h-1" />
                  )}
                </div>
                
                {/* Status */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {file.status === "complete" && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                  {file.status === "uploading" && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>{Math.round(file.progress)}%</span>
                    </div>
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  {(file.status === "pending" || file.status === "error") && !isUploading && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); removeFile(file.relativePath); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
              גרור ושחרר קבצים או תיקיות - מבנה התיקיות יישמר אוטומטית
            </p>
          </div>

          {/* Not logged in warning */}
          {!user && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-foreground">יש להתחבר כדי להעלות קבצים</p>
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
                  <FolderOpen className={`w-10 h-10 transition-colors ${isDragging ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>

                {/* Text */}
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {isDragging ? 'שחרר כאן להעלאה' : 'גרור קבצים או תיקיות לכאן'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  מבנה התיקיות יישמר אוטומטית
                </p>

                {/* Upload Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label>
                    <input
                      ref={fileInputRef}
                      type="file"
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
                  כל סוגי הקבצים נתמכים • ללא הגבלת גודל • מבנה תיקיות נשמר
                </p>
              </div>
            </div>

            {/* Overall Progress */}
            {isUploading && (
              <div className="p-6 rounded-xl bg-card border border-primary/30 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                    </div>
                    <div>
                      <span className="font-semibold">מעלה קבצים...</span>
                      <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {currentUploadingFile}
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
                </div>
                <Progress value={overallProgress} className="h-3" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{uploadedFiles.filter(f => f.status === "complete").length} / {uploadedFiles.length} קבצים</span>
                  <span>{uploadedFiles.filter(f => f.status === "error").length > 0 && `${uploadedFiles.filter(f => f.status === "error").length} שגיאות`}</span>
                </div>
              </div>
            )}

            {/* Uploaded Files Tree */}
            {uploadedFiles.length > 0 && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">קבצים להעלאה ({uploadedFiles.length})</h4>
                  {!isUploading && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setUploadedFiles([])}
                    >
                      נקה הכל
                    </Button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {renderFolderTree(folderTree)}
                </div>
              </div>
            )}

            {/* Details Form */}
            {uploadedFiles.length > 0 && (
              <div className="gradient-card rounded-xl border border-border p-6 space-y-4">
                <h4 className="font-semibold mb-4">פרטי ההעלאה</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="title">שם ההעלאה *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="הזן שם להעלאה"
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
                    placeholder="הוסף תיאור..."
                    className="bg-secondary border-border min-h-[80px]"
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
                      העלה {uploadedFiles.length} קבצים
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
