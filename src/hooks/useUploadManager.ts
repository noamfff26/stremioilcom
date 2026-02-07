import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  thumbnail: string | null;
  progress: number;
  status: "pending" | "uploading" | "paused" | "complete" | "error";
  errorMessage?: string;
  duration?: number;
  fileType: "video" | "image" | "document" | "other";
  relativePath: string;
  folderPath: string;
  uploadedBytes: number;
  totalBytes: number;
}

export interface FolderNode {
  name: string;
  path: string;
  files: UploadedFile[];
  subfolders: Map<string, FolderNode>;
  isOpen: boolean;
  progress: number;
  status: "pending" | "uploading" | "paused" | "complete" | "partial" | "error";
}

interface UploadManagerState {
  files: UploadedFile[];
  isPaused: boolean;
  isUploading: boolean;
  overallProgress: number;
  currentUploadingFile: string;
}

export const useUploadManager = (userId: string | undefined) => {
  const [state, setState] = useState<UploadManagerState>({
    files: [],
    isPaused: false,
    isUploading: false,
    overallProgress: 0,
    currentUploadingFile: "",
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);
  const uploadQueueRef = useRef<UploadedFile[]>([]);
  const currentUploadIndexRef = useRef(0);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const getFileType = (file: File): "video" | "image" | "document" | "other" => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text") || 
        file.type.includes("spreadsheet") || file.type.includes("presentation")) return "document";
    return "other";
  };

  const generateThumbnail = (file: File): Promise<{ thumbnail: string; duration: number }> => {
    return new Promise((resolve) => {
      const fileType = getFileType(file);
      
      if (fileType === "image") {
        const reader = new FileReader();
        reader.onload = () => resolve({ thumbnail: reader.result as string, duration: 0 });
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

  const addFiles = useCallback(async (filesWithPaths: { file: File; path: string }[]) => {
    const newFiles: UploadedFile[] = [];
    
    for (const { file, path } of filesWithPaths) {
      const preview = URL.createObjectURL(file);
      const fileType = getFileType(file);
      const { thumbnail, duration } = await generateThumbnail(file);
      const relativePath = path ? `${path}/${file.name}` : file.name;
      
      newFiles.push({
        id: generateId(),
        file,
        preview,
        thumbnail,
        progress: 0,
        status: "pending",
        duration,
        fileType,
        relativePath,
        folderPath: path,
        uploadedBytes: 0,
        totalBytes: file.size,
      });
    }
    
    setState(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));
    
    return newFiles;
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setState(prev => {
      const fileToRemove = prev.files.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return {
        ...prev,
        files: prev.files.filter(f => f.id !== fileId),
      };
    });
  }, []);

  const clearFiles = useCallback(() => {
    setState(prev => {
      prev.files.forEach(f => URL.revokeObjectURL(f.preview));
      return {
        ...prev,
        files: [],
      };
    });
  }, []);

  const updateFileProgress = useCallback((fileId: string, progress: number, status?: UploadedFile["status"]) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.id === fileId 
          ? { ...f, progress, ...(status && { status }) }
          : f
      ),
    }));
  }, []);

  const updateFileStatus = useCallback((fileId: string, status: UploadedFile["status"], errorMessage?: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.id === fileId 
          ? { ...f, status, errorMessage }
          : f
      ),
    }));
  }, []);

  // Chunked upload with progress tracking
  const uploadFileChunked = async (
    uploadedFile: UploadedFile,
  ): Promise<string | null> => {
    if (!userId) return null;

    const fileExt = uploadedFile.file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    setState(prev => ({
      ...prev,
      currentUploadingFile: uploadedFile.relativePath,
    }));

    updateFileStatus(uploadedFile.id, "uploading");
    updateFileProgress(uploadedFile.id, 5);

    try {
      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<string | null>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        abortControllerRef.current = new AbortController();
        
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 95) + 5;
            updateFileProgress(uploadedFile.id, percentComplete);
          }
        });

        xhr.addEventListener("load", async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateFileProgress(uploadedFile.id, 100);
            updateFileStatus(uploadedFile.id, "complete");
            
            // Get public URL
            const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
            resolve(urlData.publicUrl);
          } else {
            updateFileStatus(uploadedFile.id, "error", "שגיאה בהעלאה");
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          updateFileStatus(uploadedFile.id, "error", "שגיאה בחיבור");
          reject(new Error("Network error"));
        });

        xhr.addEventListener("abort", () => {
          updateFileStatus(uploadedFile.id, "paused");
          resolve(null);
        });

        // Get upload URL
        const projectUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        xhr.open("POST", `${projectUrl}/storage/v1/object/videos/${fileName}`);
        xhr.setRequestHeader("Authorization", `Bearer ${anonKey}`);
        xhr.setRequestHeader("x-upsert", "false");
        
        xhr.send(uploadedFile.file);
        
        // Handle abort signal
        abortControllerRef.current.signal.addEventListener("abort", () => {
          xhr.abort();
        });
      });

      return result;
    } catch (error) {
      console.error("Upload error:", error);
      updateFileStatus(uploadedFile.id, "error", "שגיאה בהעלאה");
      return null;
    }
  };

  const pauseUpload = useCallback(() => {
    pausedRef.current = true;
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, isPaused: true }));
    
    // Mark currently uploading file as paused
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.status === "uploading" ? { ...f, status: "paused" as const } : f
      ),
    }));
    
    toast.info("ההעלאה הושהתה");
  }, []);

  const resumeUpload = useCallback(() => {
    pausedRef.current = false;
    setState(prev => ({ ...prev, isPaused: false }));
    
    // Resume paused files
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.status === "paused" ? { ...f, status: "pending" as const } : f
      ),
    }));
    
    toast.info("ההעלאה ממשיכה...");
  }, []);

  const uploadThumbnailToStorage = async (thumbnailDataUrl: string): Promise<string | null> => {
    if (!userId) return null;
    
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

  const createFolderInDB = async (
    folderPath: string, 
    parentId: string | null, 
    createdFolders: Map<string, string>
  ): Promise<string | null> => {
    if (!userId) return null;
    
    if (createdFolders.has(folderPath)) {
      return createdFolders.get(folderPath)!;
    }

    const folderName = folderPath.split("/").pop() || folderPath;
    
    const { data, error } = await supabase.from("folders").insert({
      user_id: userId,
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

  const startUpload = async (
    title: string,
    description: string,
    category: string,
    onComplete: () => void
  ) => {
    if (!userId) {
      toast.error("יש להתחבר כדי להעלות קבצים");
      return;
    }

    if (state.files.length === 0) {
      toast.error("יש לבחור קובץ להעלאה");
      return;
    }

    if (!title.trim()) {
      toast.error("יש להזין כותרת");
      return;
    }

    setState(prev => ({ ...prev, isUploading: true, overallProgress: 0 }));
    pausedRef.current = false;

    let successCount = 0;
    const createdFolders = new Map<string, string>();
    const filesToUpload = state.files.filter(f => f.status !== "complete");

    try {
      // Create folders first
      const uniqueFolderPaths = [...new Set(filesToUpload.map(f => f.folderPath).filter(Boolean))];
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

      // Upload files
      for (let i = 0; i < filesToUpload.length; i++) {
        // Check if paused
        if (pausedRef.current) {
          break;
        }

        const uploadedFile = filesToUpload[i];
        
        // Skip already completed files
        if (uploadedFile.status === "complete") {
          successCount++;
          continue;
        }
        
        setState(prev => ({
          ...prev,
          overallProgress: Math.round((i / filesToUpload.length) * 100),
        }));
        
        const videoUrl = await uploadFileChunked(uploadedFile);
        
        if (!videoUrl) {
          if (pausedRef.current) break;
          toast.error(`שגיאה בהעלאת ${uploadedFile.file.name}`);
          continue;
        }

        let thumbnailUrl: string | null = null;
        if (uploadedFile.thumbnail) {
          thumbnailUrl = await uploadThumbnailToStorage(uploadedFile.thumbnail);
        }

        const folderId = uploadedFile.folderPath ? createdFolders.get(uploadedFile.folderPath) : null;

        const { error: dbError } = await supabase.from("videos").insert({
          user_id: userId,
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

      if (!pausedRef.current) {
        setState(prev => ({ ...prev, overallProgress: 100, currentUploadingFile: "" }));

        if (successCount > 0) {
          toast.success(`${successCount} קבצים הועלו בהצלחה!`);
          clearFiles();
          onComplete();
        }
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("אירעה שגיאה בהעלאה");
    } finally {
      if (!pausedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isUploading: false, 
          overallProgress: 0,
          currentUploadingFile: "" 
        }));
      }
    }
  };

  return {
    files: state.files,
    isPaused: state.isPaused,
    isUploading: state.isUploading,
    overallProgress: state.overallProgress,
    currentUploadingFile: state.currentUploadingFile,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    pauseUpload,
    resumeUpload,
    getFileType,
  };
};
