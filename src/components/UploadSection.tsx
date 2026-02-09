import { useState, useCallback, useRef, useMemo } from "react";
import { Upload, Cloud, CheckCircle2, X, Loader2, AlertCircle, FolderOpen, File, FileImage, FileText, FileVideo, ChevronDown, ChevronLeft, Pause, Play, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUploadManager, FolderNode } from "@/hooks/useUploadManager";
import { UrlUpload } from "@/components/UrlUpload";

const categories = ["הדרכה", "ישיבות", "מוצר", "וובינר", "דוחות", "כללי"];

export const UploadSection = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("כללי");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const {
    files: uploadedFiles,
    isPaused,
    isUploading,
    overallProgress,
    currentUploadingFile,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    pauseUpload,
    resumeUpload,
    getFileType,
  } = useUploadManager(user?.id);

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

      if (pathParts.length === 0) {
        root.files.push(file);
      } else {
        currentNode.files.push(file);
      }
    }

    // Calculate folder statuses
    const calculateFolderStatus = (node: FolderNode): void => {
      const allFiles: typeof uploadedFiles = [];
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
      } else if (statuses.some(s => s === "paused")) {
        node.status = "paused";
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

  const hasSubfolders = uploadedFiles.some(f => f.folderPath.length > 0); const hideSingleFileProgress = isUploading && uploadedFiles.length === 1;

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

    Promise.all(filePromises).then(async (fileArrays) => {
      const allFiles = fileArrays.flat();
      if (allFiles.length === 0) {
        toast.error("לא נמצאו קבצים");
        return;
      }
      await addFiles(allFiles);
      
      // Auto-expand all folders
      const allPaths = new Set<string>([""]);
      for (const { path } of allFiles) {
        const parts = path.split("/").filter(Boolean);
        for (let i = 0; i <= parts.length; i++) {
          allPaths.add(parts.slice(0, i).join("/"));
        }
      }
      setExpandedFolders(allPaths);
      
      if (!title && allFiles.length > 0) {
        const rootFolder = allFiles[0].path.split("/")[0];
        setTitle(rootFolder || allFiles[0].file.name.replace(/\.[^/.]+$/, ""));
      }
    });
  }, [addFiles, title]);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        await addFiles(files.map(f => ({ file: f, path: "" })));
        if (!title) {
          setTitle(files[0].name.replace(/\.[^/.]+$/, ""));
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        const filesWithPaths = files.map(f => {
          const relativePath = (f as any).webkitRelativePath || f.name;
          const pathParts = relativePath.split("/");
          pathParts.pop();
          return { file: f, path: pathParts.join("/") };
        });
        await addFiles(filesWithPaths);
        
        const rootFolder = files[0] && (files[0] as any).webkitRelativePath?.split("/")[0];
        toast.success(`נמצאו ${files.length} קבצים בתיקייה "${rootFolder}"`);
        
        if (!title) {
          setTitle(rootFolder || "");
        }
        
        // Auto-expand all folders
        const allPaths = new Set<string>([""]);
        for (const { path } of filesWithPaths) {
          const parts = path.split("/").filter(Boolean);
          for (let i = 0; i <= parts.length; i++) {
            allPaths.add(parts.slice(0, i).join("/"));
          }
        }
        setExpandedFolders(allPaths);
      } else {
        toast.error("לא נמצאו קבצים בתיקייה");
      }
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileType: "video" | "image" | "document" | "other") => {
    switch (fileType) {
      case "video": return FileVideo;
      case "image": return FileImage;
      case "document": return FileText;
      default: return File;
    }
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

  const handleUpload = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי להעלות קבצים");
      navigate("/auth");
      return;
    }

    await startUpload(title, description, category, () => {
      setTitle("");
      setDescription("");
      setCategory("כללי");
      setExpandedFolders(new Set([""]));
    });
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
        case "uploading": return "text-accent";
        case "paused": return "text-accent";
        case "error": return "text-destructive";
        case "partial": return "text-accent";
        default: return "text-muted-foreground";
      }
    };

    const getStatusIcon = () => {
      switch (node.status) {
        case "complete": return <CheckCircle2 className="w-4 h-4" />;
        case "uploading": return <Loader2 className="w-4 h-4 animate-spin" />;
        case "paused": return <Pause className="w-4 h-4" />;
        case "error": return <AlertCircle className="w-4 h-4" />;
        default: return null;
      }
    };

    return (
      <div key={node.path || "root"} className="space-y-1">
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
            
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
              {node.status === "uploading" && (
                <span className="text-xs">{node.progress}%</span>
              )}
              {getStatusIcon()}
            </div>
          </div>
        )}

        {isExpanded && (
          <div className={depth > 0 ? "mr-4 border-r border-border pr-2" : ""} style={{ marginRight: depth * 16 }}>
            {Array.from(node.subfolders.values()).map(subfolder => renderFolderTree(subfolder, depth + 1))}
            
            {node.files.map((file) => (
              <div 
                key={file.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  currentUploadingFile === file.relativePath ? "bg-primary/10 border border-primary/30" : 
                  file.status === "error" ? "bg-destructive/5" : 
                  file.status === "paused" ? "bg-accent/5" : "hover:bg-secondary/30"
                }`}
                style={{ marginRight: (depth + 1) * 16 }}
              >
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
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file.size)}</span>
                    {file.duration && file.duration > 0 && (
                      <span>• {formatDuration(file.duration)}</span>
                    )}
                    {file.status === "paused" && (
                      <span className="text-accent">• מושהה</span>
                    )}
                  </div>
                  {!hideSingleFileProgress && (file.status === "uploading" || file.status === "paused") && (
                    <Progress value={file.progress} className="mt-1 h-1" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {file.status === "complete" && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                  {file.status === "uploading" && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      {!hideSingleFileProgress && <span>{Math.round(file.progress)}%</span>}
                    </div>
                  )}
                  {file.status === "paused" && (
                    <Pause className="w-5 h-5 text-accent" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  {(file.status === "pending" || file.status === "error") && !isUploading && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
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
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all duration-300 ${isDragging ? 'gradient-primary glow-primary scale-110' : 'bg-secondary'}`}>
                  <FolderOpen className={`w-10 h-10 transition-colors ${isDragging ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>

                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {isDragging ? 'שחרר כאן להעלאה' : 'גרור קבצים או תיקיות לכאן'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  מבנה התיקיות יישמר אוטומטית
                </p>

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

                <p className="text-sm text-muted-foreground mt-4">
                  כל סוגי הקבצים נתמכים • ללא הגבלת גודל • מבנה תיקיות נשמר
                </p>
              </div>
            </div>

            {/* URL Upload */}
            <UrlUpload 
              onFileDownloaded={async (file) => {
                await addFiles([{ file, path: "" }]);
                if (!title) {
                  setTitle(file.name.replace(/\.[^/.]+$/, ""));
                }
              }}
              disabled={isUploading}
            />

            {/* Overall Progress with Pause/Resume */}
            {isUploading && (
              <div className="p-6 rounded-xl bg-card border border-primary/30 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaused ? 'bg-accent' : 'gradient-primary'}`}>
                      {isPaused ? (
                        <Pause className="w-5 h-5 text-accent-foreground" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold">
                        {isPaused ? "ההעלאה מושהית" : uploadedFiles.length === 1 ? "מעלה קובץ..." : `מעלה ${uploadedFiles.length} קבצים...`}
                      </span>
                      {uploadedFiles.length > 1 && currentUploadingFile && (
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">{currentUploadingFile}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
                    <Button
                      variant={isPaused ? "hero" : "outline"}
                      size="sm"
                      onClick={isPaused ? resumeUpload : pauseUpload}
                      className="gap-2"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-4 h-4" />
                          המשך
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          השהה
                        </>
                      )}
                    </Button>
                  </div>
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
                      onClick={clearFiles}
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
                    placeholder="הזן שם לאוסף הקבצים"
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
                    placeholder="תיאור קצר של הקבצים..."
                    className="bg-secondary border-border min-h-[80px] resize-none"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">קטגוריה</Label>
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
                      העלה {uploadedFiles.length} קבצים
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
