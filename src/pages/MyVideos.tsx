import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VideoCard } from "@/components/VideoCard";
import { VideoModal } from "@/components/VideoModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FolderOpen
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchContent();
    }
  }, [user, currentFolderId]);

  const fetchContent = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .eq("parent_id", currentFolderId ?? "")
        .order("name");

      // For root level, we need to handle null parent_id differently
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
                נהל את כל הסרטונים והתיקיות שלך במקום אחד
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
                  </h2>
                  <div className={`grid gap-4 ${viewMode === "grid" ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1'}`}>
                    {filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="group relative p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${folder.color}20` }}
                          >
                            <FolderOpen className="w-6 h-6" style={{ color: folder.color || "#3b82f6" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{folder.name}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(folder.created_at)}</p>
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
                      <div key={video.id} className="group relative">
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
                              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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

      {/* Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingFolder ? "עריכת תיקיה" : "תיקיה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">שם התיקיה</label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="הזן שם לתיקיה"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">צבע</label>
              <div className="flex gap-2">
                {folderColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFolderColor(color.value)}
                    className={`w-8 h-8 rounded-full transition-transform ${folderColor === color.value ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color.value }}
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
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            האם אתה בטוח שברצונך למחוק את {itemToDelete?.type === "folder" ? "התיקיה" : "הסרטון"} "{itemToDelete?.name}"?
            {itemToDelete?.type === "folder" && " כל הסרטונים בתיקיה יועברו לתיקיה הראשית."}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={deleteItem}>
              <Trash2 className="w-4 h-4 ml-2" />
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={selectedVideo ? {
          title: selectedVideo.title,
          videoUrl: selectedVideo.video_url || "",
          thumbnail: selectedVideo.thumbnail_url || "",
        } : null}
      />
    </div>
  );
};

export default MyVideos;
