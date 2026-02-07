import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
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

async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID");
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Microsoft credentials. Please configure MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

async function graphRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return response;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "list-sites": {
        // List available SharePoint sites
        const response = await graphRequest("/sites?search=*");
        
        if (!response.ok) {
          const error = await response.text();
          console.error("Graph API error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to list sites" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify({ sites: data.value }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-drives": {
        // List drives in a site
        const siteId = url.searchParams.get("siteId");
        if (!siteId) {
          return new Response(
            JSON.stringify({ error: "siteId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await graphRequest(`/sites/${siteId}/drives`);
        
        if (!response.ok) {
          const error = await response.text();
          console.error("Graph API error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to list drives" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify({ drives: data.value }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-files": {
        // List files in a drive/folder
        const driveId = url.searchParams.get("driveId");
        const folderId = url.searchParams.get("folderId") || "root";
        
        if (!driveId) {
          return new Response(
            JSON.stringify({ error: "driveId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const endpoint = folderId === "root" 
          ? `/drives/${driveId}/root/children`
          : `/drives/${driveId}/items/${folderId}/children`;

        const response = await graphRequest(endpoint);
        
        if (!response.ok) {
          const error = await response.text();
          console.error("Graph API error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to list files" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        const files: SharePointFile[] = data.value;
        
        return new Response(
          JSON.stringify({ files }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "upload": {
        // Upload a file to SharePoint
        const driveId = url.searchParams.get("driveId");
        const fileName = url.searchParams.get("fileName");
        const folderId = url.searchParams.get("folderId") || "root";
        
        if (!driveId || !fileName) {
          return new Response(
            JSON.stringify({ error: "driveId and fileName are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const fileContent = await req.arrayBuffer();
        const fileSize = fileContent.byteLength;

        // For files under 4MB, use simple upload
        if (fileSize < 4 * 1024 * 1024) {
          const endpoint = folderId === "root"
            ? `/drives/${driveId}/root:/${fileName}:/content`
            : `/drives/${driveId}/items/${folderId}:/${fileName}:/content`;

          const accessToken = await getAccessToken();
          const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/octet-stream",
            },
            body: fileContent,
          });

          if (!response.ok) {
            const error = await response.text();
            console.error("Upload error:", error);
            return new Response(
              JSON.stringify({ error: "Failed to upload file" }),
              { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const data = await response.json();
          return new Response(
            JSON.stringify({ 
              success: true, 
              file: {
                id: data.id,
                name: data.name,
                webUrl: data.webUrl,
                size: data.size,
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // For larger files, create upload session
        const endpoint = folderId === "root"
          ? `/drives/${driveId}/root:/${fileName}:/createUploadSession`
          : `/drives/${driveId}/items/${folderId}:/${fileName}:/createUploadSession`;

        const sessionResponse = await graphRequest(endpoint, {
          method: "POST",
          body: JSON.stringify({
            item: {
              "@microsoft.graph.conflictBehavior": "rename",
            },
          }),
        });

        if (!sessionResponse.ok) {
          const error = await sessionResponse.text();
          console.error("Session error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create upload session" }),
            { status: sessionResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = await sessionResponse.json();
        
        return new Response(
          JSON.stringify({ 
            uploadUrl: session.uploadUrl,
            expirationDateTime: session.expirationDateTime,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-download-url": {
        // Get download URL for a file
        const driveId = url.searchParams.get("driveId");
        const itemId = url.searchParams.get("itemId");
        
        if (!driveId || !itemId) {
          return new Response(
            JSON.stringify({ error: "driveId and itemId are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await graphRequest(`/drives/${driveId}/items/${itemId}`);
        
        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to get file info" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        
        return new Response(
          JSON.stringify({ 
            downloadUrl: data["@microsoft.graph.downloadUrl"],
            webUrl: data.webUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: list-sites, list-drives, list-files, upload, get-download-url" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("SharePoint function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
