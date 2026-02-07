import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, type } = await req.json();

    if (!url || !type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing url or type parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${type} video:`, url);

    let videoInfo: { title: string; downloadUrl: string; thumbnail?: string } | null = null;

    if (type === "youtube") {
      videoInfo = await getYoutubeInfo(url);
    } else if (type === "vimeo") {
      videoInfo = await getVimeoInfo(url);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Unsupported video type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!videoInfo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "לא ניתן להוריד את הסרטון. ייתכן שהסרטון פרטי או שאין הרשאות גישה." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        title: videoInfo.title,
        downloadUrl: videoInfo.downloadUrl,
        thumbnail: videoInfo.thumbnail
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing video:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "שגיאה בעיבוד הסרטון"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getYoutubeInfo(url: string): Promise<{ title: string; downloadUrl: string; thumbnail?: string } | null> {
  // Extract video ID from various YouTube URL formats
  const videoId = extractYoutubeVideoId(url);
  
  if (!videoId) {
    console.error("Could not extract YouTube video ID from:", url);
    return null;
  }

  console.log("YouTube video ID:", videoId);

  try {
    // Use yt-dlp API alternative or YouTube oEmbed for info
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const infoResponse = await fetch(oembedUrl);
    
    let title = "YouTube Video";
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      title = info.title || title;
    }

    // For direct download, we need to use a service
    // Note: Direct YouTube downloads require specific services
    // Here we return info about the video - frontend will need to handle accordingly
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // Use cobalt.tools API for video download (free and open source)
    const cobaltResponse = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: "auto",
        youtubeVideoCodec: "h264",
        videoQuality: "720",
      }),
    });

    if (cobaltResponse.ok) {
      const cobaltData = await cobaltResponse.json();
      if (cobaltData.url) {
        return {
          title,
          downloadUrl: cobaltData.url,
          thumbnail,
        };
      }
    }

    // Fallback: Return info but indicate download not available directly
    console.log("Could not get direct download URL from cobalt");
    return null;
  } catch (error) {
    console.error("Error getting YouTube info:", error);
    return null;
  }
}

async function getVimeoInfo(url: string): Promise<{ title: string; downloadUrl: string; thumbnail?: string } | null> {
  // Extract video ID from Vimeo URL
  const videoIdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const videoId = videoIdMatch?.[1];

  if (!videoId) {
    console.error("Could not extract Vimeo video ID from:", url);
    return null;
  }

  console.log("Vimeo video ID:", videoId);

  try {
    // Get video info from Vimeo oEmbed
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const infoResponse = await fetch(oembedUrl);
    
    let title = "Vimeo Video";
    let thumbnail: string | undefined;
    
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      title = info.title || title;
      thumbnail = info.thumbnail_url;
    }

    // Use cobalt.tools for Vimeo as well
    const cobaltResponse = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        downloadMode: "auto",
        videoQuality: "720",
      }),
    });

    if (cobaltResponse.ok) {
      const cobaltData = await cobaltResponse.json();
      if (cobaltData.url) {
        return {
          title,
          downloadUrl: cobaltData.url,
          thumbnail,
        };
      }
    }

    console.log("Could not get direct download URL for Vimeo");
    return null;
  } catch (error) {
    console.error("Error getting Vimeo info:", error);
    return null;
  }
}

function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}
