import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
};

// Get correct MIME type for video files
function getVideoMimeType(url: string, serverContentType: string): string {
  // Extract filename from URL
  const pathname = new URL(url).pathname;
  const ext = pathname.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'm4v': 'video/x-m4v',
    'ts': 'video/mp2t',
    'flv': 'video/x-flv',
    'wmv': 'video/x-ms-wmv',
    'ogv': 'video/ogg',
    'm3u8': 'application/vnd.apple.mpegurl',
  };

  // If server returns a non-video content type, try to determine from extension
  if (serverContentType.includes('force-download') || 
      serverContentType.includes('octet-stream') ||
      !serverContentType.startsWith('video/')) {
    const detectedType = mimeTypes[ext];
    if (detectedType) {
      console.log(`Overriding Content-Type from "${serverContentType}" to "${detectedType}" based on extension .${ext}`);
      return detectedType;
    }
  }

  // Return server's content type if it's already a video type
  if (serverContentType.startsWith('video/')) {
    return serverContentType;
  }

  // Default to mp4
  return 'video/mp4';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const urlParam = new URL(req.url).searchParams.get('url');
    
    if (!urlParam) {
      return new Response(
        JSON.stringify({ error: 'URL parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = decodeURIComponent(urlParam);
    console.log(`Streaming video from URL: ${url}`);

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forward range header if present
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: Record<string, string> = {
      ...browserHeaders,
      'Referer': parsedUrl.origin + '/',
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
      console.log(`Range request: ${rangeHeader}`);
    }

    // Fetch the video
    const response = await fetch(url, {
      headers: fetchHeaders,
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 206) {
      console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get content info and fix content type
    const serverContentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentType = getVideoMimeType(url, serverContentType);
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes';

    console.log(`Response status: ${response.status}, Original Content-Type: ${serverContentType}, Using: ${contentType}, Content-Length: ${contentLength}`);

    // Build response headers
    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
      'Cache-Control': 'public, max-age=3600',
    });

    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    // Stream the response
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Stream video error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to stream video' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
