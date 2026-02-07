import { supabase } from "@/integrations/supabase/client";

interface SharePointSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

interface SharePointDrive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
}

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
}

class SharePointService {
  private async callFunction(action: string, params: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams({ action, ...params });
    
    const { data, error } = await supabase.functions.invoke("sharepoint", {
      body: null,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async listSites(): Promise<SharePointSite[]> {
    const response = await this.callFunction("list-sites");
    return response.sites || [];
  }

  async listDrives(siteId: string): Promise<SharePointDrive[]> {
    const response = await this.callFunction("list-drives", { siteId });
    return response.drives || [];
  }

  async listFiles(driveId: string, folderId?: string): Promise<SharePointFile[]> {
    const params: Record<string, string> = { driveId };
    if (folderId) params.folderId = folderId;
    
    const response = await this.callFunction("list-files", params);
    return response.files || [];
  }

  async uploadFile(
    driveId: string, 
    file: File, 
    folderId?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; name: string; webUrl: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("Not authenticated");
    }

    const params = new URLSearchParams({
      action: "upload",
      driveId,
      fileName: file.name,
    });
    
    if (folderId) params.append("folderId", folderId);

    // For small files
    if (file.size < 4 * 1024 * 1024) {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint?${params}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: await file.arrayBuffer(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      onProgress?.(100);
      return data.file;
    }

    // For large files - get upload session
    const sessionResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint?${params}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!sessionResponse.ok) {
      const error = await sessionResponse.json();
      throw new Error(error.error || "Failed to create upload session");
    }

    const { uploadUrl } = await sessionResponse.json();

    // Upload in chunks
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedFile: any;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const chunkResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
        },
        body: chunk,
      });

      if (!chunkResponse.ok && chunkResponse.status !== 202) {
        throw new Error("Chunk upload failed");
      }

      onProgress?.(Math.round(((i + 1) / totalChunks) * 100));

      if (chunkResponse.status === 200 || chunkResponse.status === 201) {
        uploadedFile = await chunkResponse.json();
      }
    }

    return {
      id: uploadedFile.id,
      name: uploadedFile.name,
      webUrl: uploadedFile.webUrl,
    };
  }

  async getDownloadUrl(driveId: string, itemId: string): Promise<string> {
    const response = await this.callFunction("get-download-url", { driveId, itemId });
    return response.downloadUrl;
  }
}

export const sharePointService = new SharePointService();
export type { SharePointSite, SharePointDrive, SharePointFile };
