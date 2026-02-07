import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VideoCard } from "@/components/VideoCard";
import { VideoModal } from "@/components/VideoModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Folder, 
  FolderPlus, 
  Grid, 
  List, 
  Search, 
  Upload, 
  MoreVertical,
  Trash2,
  Edit,
  Video,
  ArrowLeft,
  Loader2,
  FolderOpen,
  FolderInput,
  CheckCircle2,
  Move,
  Home
} from "lucide-react";
import { toast } from "sonner";

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  views_count: number | null;
  category: string | null;
  created_at: string;
  folder_id: string | null;
}

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
  parent_id: string | null;
  created_at: string;
}

interface UploadingFile {
  file: File;
  name: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
}

const folderColors = [
  { name: "כחול", value: "#3b82f6" },
  { name: "ירוק", value: "#22c55e" },
  { name: "סגול", value: "#a855f7" },
  { name: "אדום", value: "#ef4444" },
  { name: "כתום", value: "#f97316" },
  { name: "ורוד", value: "#ec4899" },
];

const MyVideos = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  
  // Folder dialog state
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("#3b82f6");
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "video" | "folder"; id: string; name: string } | null>(null);

  // Drag and drop state
  const [draggingOverFolder, setDraggingOverFolder] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  
  // Video drag state
  const [draggingVideoId, setDraggingVideoId] = useState<string | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [videoToMove, setVideoToMove] = useState<VideoItem | null>(null);
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchContent();
      fetchAllFolders();
    }
  }, [user, currentFolderId]);

  const fetchContent = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch folders
      let folderQuery = supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      
      if (currentFolderId) {
        folderQuery = folderQuery.eq("parent_id", currentFolderId);
      } else {
        folderQuery = folderQuery.is("parent_id", null);
      }
      
      const { data: fetchedFolders, error: fetchError } = await folderQuery;

      if (fetchError) {
        console.error("Error fetching folders:", fetchError);
      } else {
        setFolders(fetchedFolders || []);
      }

      // Fetch videos
      let videosQuery = supabase
        .from("videos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (currentFolderId) {
        videosQuery = videosQuery.eq("folder_id", currentFolderId);
      } else {
        videosQuery = videosQuery.is("folder_id", null);
      }

      const { data: videosData, error: videosError } = await videosQuery;

      if (videosError) {
        console.error("Error fetching videos:", videosError);
      } else {
        setVideos(videosData || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all folders for move dialog
  const fetchAllFolders = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    
    if (!error && data) {
      setAllFolders(data);
    }
  };

  // Move video to folder
  const moveVideoToFolder = async (videoId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("videos")
        .update({ folder_id: folderId })
        .eq("id", videoId);

      if (error) throw error;
      
      toast.success(folderId ? "הסרטון הועבר לתיקייה" : "הסרטון הועבר לתיקייה הראשית");
      setShowMoveDialog(false);
      setVideoToMove(null);
      setDraggingVideoId(null);
      fetchContent();
    } catch (error) {
      console.error("Error moving video:", error);
      toast.error("שגיאה בהעברת הסרטון");
    }
  };

  // Handle video drag start
  const handleVideoDragStart = (e: React.DragEvent, video: VideoItem) => {
    setDraggingVideoId(video.id);
    e.dataTransfer.setData("video-id", video.id);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle video drag end
  const handleVideoDragEnd = () => {
    setDraggingVideoId(null);
    setDraggingOverFolder(null);
  };

  // Enhanced folder drop handler
  const handleFolderDropWithVideos = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverFolder(null);

    // Check if dragging a video
    const videoId = e.dataTransfer.getData("video-id");
    if (videoId) {
      await moveVideoToFolder(videoId, targetFolderId);
      return;
    }

    // Otherwise handle file upload (existing logic)
    handleFolderDrop(e, targetFolderId);
  };

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

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverFolder(folderId);
  }, []);

  const handleFolderDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverFolder(null);

    if (!user) {
      toast.error("יש להתחבר כדי להעלות קבצים");
      return;
    }

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

    const fileArrays = await Promise.all(filePromises);
    const allFiles = fileArrays.flat();

    if (allFiles.length === 0) {
      toast.error("לא נמצאו קבצים");
      return;
    }

    toast.success(`מעלה ${allFiles.length} קבצים לתיקייה`);
    setShowUploadProgress(true);

    // Create subfolders and upload files
    const createdFolders = new Map<string, string>();
    const uploadFiles: UploadingFile[] = allFiles.map(({ file }) => ({
      file,
      name: file.name,
      progress: 0,
      status: "pending" as const,
    }));
    setUploadingFiles(uploadFiles);

    // First create folder structure
    const uniqueFolderPaths = [...new Set(allFiles.map(f => f.path).filter(Boolean))];
    uniqueFolderPaths.sort((a, b) => a.split("/").length - b.split("/").length);

    for (const folderPath of uniqueFolderPaths) {
      const parts = folderPath.split("/");
      let parentId: string = targetFolderId;
      
      for (let i = 0; i < parts.length; i++) {
        const currentPath = parts.slice(0, i + 1).join("/");
        
        if (createdFolders.has(currentPath)) {
          parentId = createdFolders.get(currentPath)!;
          continue;
        }

        const folderName = parts[i];
        const { data, error } = await supabase.from("folders").insert({
          user_id: user.id,
          name: folderName,
          parent_id: parentId,
        }).select().single();

        if (!error && data) {
          createdFolders.set(currentPath, data.id);
          parentId = data.id;
        }
      }
    }

    // Upload files
    let successCount = 0;
    for (let i = 0; i < allFiles.length; i++) {
      const { file, path } = allFiles[i];
      
      // Update status
      setUploadingFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: "uploading" as const, progress: 5 } : f
      ));

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => prev.map((f, idx) => {
            if (idx === i && f.status === "uploading" && f.progress < 90) {
              return { ...f, progress: f.progress + Math.random() * 15 };
            }
            return f;
          }));
        }, 300);

        const { data, error } = await supabase.storage
          .from("videos")
          .upload(fileName, file, { cacheControl: "3600" });

        clearInterval(progressInterval);

        if (error) {
          setUploadingFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: "error" as const } : f
          ));
          continue;
        }

        const { data: urlData } = supabase.storage.from("videos").getPublicUrl(data.path);
        
        // Determine target folder
        const fileFolderId = path ? createdFolders.get(path) || targetFolderId : targetFolderId;

        // Save to database
        await supabase.from("videos").insert({
          user_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ""),
          video_url: urlData.publicUrl,
          folder_id: fileFolderId,
          category: "כללי",
        });

        setUploadingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: "complete" as const, progress: 100 } : f
        ));
        successCount++;
      } catch (error) {
        setUploadingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: "error" as const } : f
        ));
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} קבצים הועלו בהצלחה`);
      fetchContent();
    }

    // Hide progress after a delay
    setTimeout(() => {
      setShowUploadProgress(false);
      setUploadingFiles([]);
    }, 2000);
  }, [user, fetchContent]);

  const createFolder = async () => {
    if (!user || !folderName.trim()) return;

    try {
      const { error } = await supabase.from("folders").insert({
        user_id: user.id,
        name: folderName.trim(),
        color: folderColor,
        parent_id: currentFolderId,
      });

      if (error) {
        toast.error("שגיאה ביצירת תיקיה");
        console.error(error);
      } else {
        toast.success("התיקיה נוצרה בהצלחה");
        setShowFolderDialog(false);
        setFolderName("");
        setFolderColor("#3b82f6");
        fetchContent();
      }
    } catch (error) {
      toast.error("שגיאה ביצירת תיקיה");
    }
  };

  const updateFolder = async () => {
    if (!editingFolder || !folderName.trim()) return;

    try {
      const { error } = await supabase
        .from("folders")
        .update({ name: folderName.trim(), color: folderColor })
        .eq("id", editingFolder.id);

      if (error) {
        toast.error("שגיאה בעדכון תיקיה");
      } else {
        toast.success("התיקיה עודכנה");
        setShowFolderDialog(false);
        setEditingFolder(null);
        setFolderName("");
        fetchContent();
      }
    } catch (error) {
      toast.error("שגיאה בעדכון תיקיה");
    }
  };

  const deleteItem = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === "folder") {
        const { error } = await supabase
          .from("folders")
          .delete()
          .eq("id", itemToDelete.id);

        if (error) throw error;
        toast.success("התיקיה נמחקה");
      } else {
        // Delete video from storage first
        const video = videos.find(v => v.id === itemToDelete.id);
        if (video?.video_url) {
          const path = video.video_url.split("/videos/")[1];
          if (path) {
            await supabase.storage.from("videos").remove([path]);
          }
        }

        const { error } = await supabase
          .from("videos")
          .delete()
          .eq("id", itemToDelete.id);

        if (error) throw error;
        toast.success("הסרטון נמחק");
      }

      setShowDeleteDialog(false);
      setItemToDelete(null);
      fetchContent();
    } catch (error) {
      console.error(error);
      toast.error("שגיאה במחיקה");
    }
  };

  const openEditFolder = (folder: FolderItem) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color || "#3b82f6");
    setShowFolderDialog(true);
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number | null): string => {
    if (!views) return "0";
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return date.toLocaleDateString("he-IL");
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="text-gradient">הסרטונים שלי</span>
              </h1>
              <p className="text-muted-foreground">
                נהל את כל הסרטונים והתיקיות שלך במקום אחד • גרור קבצים לתיקייה להעלאה מהירה
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="glass" 
                onClick={() => {
                  setEditingFolder(null);
                  setFolderName("");
                  setFolderColor("#3b82f6");
                  setShowFolderDialog(true);
                }}
              >
                <FolderPlus className="w-4 h-4" />
                תיקיה חדשה
              </Button>
              <Button variant="hero" onClick={() => navigate("/#upload")}>
                <Upload className="w-4 h-4" />
                העלה סרטון
              </Button>
            </div>
          </div>

          {/* Upload Progress Overlay */}
          {showUploadProgress && uploadingFiles.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 rounded-xl bg-card border border-primary/30 shadow-xl animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <FolderInput className="w-5 h-5 text-primary" />
                <span className="font-semibold">מעלה קבצים לתיקייה</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.name}</p>
                      {file.status === "uploading" && (
                        <Progress value={file.progress} className="h-1 mt-1" />
                      )}
                    </div>
                    {file.status === "complete" && (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    {file.status === "uploading" && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumb / Back button */}
          {currentFolderId && (
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentFolderId(null)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                חזור לתיקיה הראשית
              </Button>
            </div>
          )}

          {/* Search and View Controls */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="חפש סרטונים ותיקיות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 bg-secondary border-border"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary mr-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${viewMode === "grid" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${viewMode === "list" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Folders Section */}
              {filteredFolders.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-primary" />
                    תיקיות ({filteredFolders.length})
                    <span className="text-xs text-muted-foreground font-normal">• גרור קבצים או סרטונים לתיקייה</span>
                  </h2>
                  <div className={`grid gap-4 ${viewMode === "grid" ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1'}`}>
                    {filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className={`group relative p-4 rounded-xl bg-card border-2 transition-all cursor-pointer ${
                          draggingOverFolder === folder.id 
                            ? 'border-primary bg-primary/10 scale-105' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setCurrentFolderId(folder.id)}
                        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => handleFolderDropWithVideos(e, folder.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform ${
                              draggingOverFolder === folder.id ? 'scale-110' : ''
                            }`}
                            style={{ backgroundColor: `${folder.color}20` }}
                          >
                            <FolderOpen className="w-6 h-6" style={{ color: folder.color || "#3b82f6" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{folder.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {draggingOverFolder === folder.id 
                                ? (draggingVideoId ? "שחרר להעברת הסרטון" : "שחרר להעלאה") 
                                : formatDate(folder.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Folder Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditFolder(folder);
                            }}>
                              <Edit className="w-4 h-4 ml-2" />
                              ערוך
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete({ type: "folder", id: folder.id, name: folder.name });
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Section */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  סרטונים ({filteredVideos.length})
                </h2>

                {filteredVideos.length === 0 && filteredFolders.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                      <Video className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">אין סרטונים עדיין</h3>
                    <p className="text-muted-foreground mb-6">העלה את הסרטון הראשון שלך או צור תיקיה חדשה</p>
                    <div className="flex items-center justify-center gap-3">
                      <Button variant="glass" onClick={() => setShowFolderDialog(true)}>
                        <FolderPlus className="w-4 h-4" />
                        צור תיקיה
                      </Button>
                      <Button variant="hero" onClick={() => navigate("/#upload")}>
                        <Upload className="w-4 h-4" />
                        העלה סרטון
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-6 ${viewMode === "grid" ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {filteredVideos.map((video) => (
                      <div 
                        key={video.id} 
                        className={`group relative cursor-grab active:cursor-grabbing ${
                          draggingVideoId === video.id ? 'opacity-50 scale-95' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleVideoDragStart(e, video)}
                        onDragEnd={handleVideoDragEnd}
                      >
                        <div onClick={() => setSelectedVideo(video)}>
                          <VideoCard
                            title={video.title}
                            thumbnail={video.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=340&fit=crop"}
                            duration={formatDuration(video.duration_seconds)}
                            views={formatViews(video.views_count)}
                            date={formatDate(video.created_at)}
                            category={video.category || "כללי"}
                          />
                        </div>

                        {/* Video Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setVideoToMove(video);
                                setShowMoveDialog(true);
                              }}
                            >
                              <Move className="w-4 h-4 ml-2" />
                              העבר לתיקיה
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setItemToDelete({ type: "video", id: video.id, name: video.title });
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          video={{
            title: selectedVideo.title,
            videoUrl: selectedVideo.video_url || "",
            thumbnail: selectedVideo.thumbnail_url || "",
          }}
        />
      )}

      {/* Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFolder ? "עריכת תיקיה" : "תיקיה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">שם התיקיה</label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="הזן שם לתיקיה"
                className="bg-secondary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">צבע</label>
              <div className="flex gap-2">
                {folderColors.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full transition-all ${folderColor === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFolderColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFolderDialog(false)}>
              ביטול
            </Button>
            <Button 
              variant="hero" 
              onClick={editingFolder ? updateFolder : createFolder}
              disabled={!folderName.trim()}
            >
              {editingFolder ? "שמור" : "צור תיקיה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
          </DialogHeader>
          <p>
            האם אתה בטוח שברצונך למחוק את {itemToDelete?.type === "folder" ? "התיקיה" : "הסרטון"} "{itemToDelete?.name}"?
          </p>
          {itemToDelete?.type === "folder" && (
            <p className="text-sm text-muted-foreground">
              שים לב: מחיקת התיקיה לא תמחק את הסרטונים שבתוכה
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={deleteItem}>
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Video Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Move className="w-5 h-5 text-primary" />
              העבר סרטון לתיקיה
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              בחר תיקיה עבור: <span className="font-medium text-foreground">{videoToMove?.title}</span>
            </p>
            
            {/* Root folder option */}
            <button
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                !videoToMove?.folder_id 
                  ? 'bg-primary/10 border border-primary' 
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
              onClick={() => moveVideoToFolder(videoToMove?.id || '', null)}
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Home className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-right">
                <p className="font-medium">תיקייה ראשית</p>
                <p className="text-sm text-muted-foreground">שורש הספריה</p>
              </div>
            </button>

            {/* Folder list */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allFolders.map((folder) => (
                <button
                  key={folder.id}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    videoToMove?.folder_id === folder.id 
                      ? 'bg-primary/10 border border-primary' 
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                  onClick={() => moveVideoToFolder(videoToMove?.id || '', folder.id)}
                  disabled={videoToMove?.folder_id === folder.id}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${folder.color}20` }}
                  >
                    <FolderOpen className="w-5 h-5" style={{ color: folder.color || "#3b82f6" }} />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-medium">{folder.name}</p>
                    {folder.parent_id && (
                      <p className="text-sm text-muted-foreground">תיקיית משנה</p>
                    )}
                  </div>
                  {videoToMove?.folder_id === folder.id && (
                    <span className="text-xs text-primary">נמצא כאן</span>
                  )}
                </button>
              ))}
            </div>

            {allFolders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                אין תיקיות. צור תיקייה חדשה כדי לארגן את הסרטונים.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowMoveDialog(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyVideos;
