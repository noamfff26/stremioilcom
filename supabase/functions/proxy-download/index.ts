import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying download for URL: ${url}`);

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

    // First, try to resolve redirects by making a HEAD request or following redirects
    let finalUrl = url;
    let response: Response;

    // For torrentio/stremio links, we need to follow redirects manually
    if (url.includes('torrentio') || url.includes('strem.fun')) {
      console.log('Detected torrentio link, following redirects...');
      
      // First request - get the redirect location
      const initialResponse = await fetch(url, {
        method: 'GET',
        headers: {
          ...browserHeaders,
          'Referer': 'https://www.stremio.com/',
        },
        redirect: 'manual', // Don't auto-follow to see the redirect
      });

      console.log(`Initial response status: ${initialResponse.status}`);
      console.log(`Location header: ${initialResponse.headers.get('location')}`);

      if (initialResponse.status >= 300 && initialResponse.status < 400) {
        const redirectUrl = initialResponse.headers.get('location');
        if (redirectUrl) {
          finalUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).href;
          console.log(`Following redirect to: ${finalUrl}`);
        }
      } else if (initialResponse.ok) {
        // No redirect, use this response
        response = initialResponse;
      } else {
        // Try with redirect: follow
        await initialResponse.body?.cancel();
        
        response = await fetch(url, {
          method: 'GET',
          headers: {
            ...browserHeaders,
            'Referer': 'https://www.stremio.com/',
          },
          redirect: 'follow',
        });
      }
    }

    // If we have a final URL different from original, fetch it
    if (finalUrl !== url || !response!) {
      console.log(`Fetching from final URL: ${finalUrl}`);
      response = await fetch(finalUrl, {
        headers: {
          ...browserHeaders,
          'Referer': parsedUrl.origin + '/',
        },
        redirect: 'follow',
      });
    }

    if (!response!.ok) {
      console.error(`Failed to fetch: ${response!.status} ${response!.statusText}`);
      const errorBody = await response!.text().catch(() => 'No body');
      console.error(`Error body: ${errorBody}`);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch: ${response!.status} ${response!.statusText}`,
          finalUrl,
          details: errorBody.substring(0, 500)
        }),
        { status: response!.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file info
    const contentType = response!.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response!.headers.get('content-length');
    const contentDisposition = response!.headers.get('content-disposition');
    
    // Extract filename from URL or content-disposition
    const finalParsedUrl = new URL(finalUrl);
    let fileName = finalParsedUrl.pathname.split('/').pop() || 'downloaded-file';
    fileName = decodeURIComponent(fileName);
    
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        fileName = match[1].replace(/['"]/g, '');
      }
    }

    console.log(`File: ${fileName}, Type: ${contentType}, Size: ${contentLength || 'unknown'}`);

    // Stream the response back
    const headers = new Headers({
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // For large files, we stream the response
    return new Response(response!.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Proxy download error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to download file' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});