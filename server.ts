import express, { Request, Response } from 'express';
import path from 'path';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', server: 'AudioCast Multi-Protocol Audio Engine' });
});

/**
 * Robust stream proxy to bypass browser Mixed Content (HTTP on HTTPS) and CORS restrictions.
 * Can proxy:
 * 1. Audio streams (MP3, AAC, OGG, etc.)
 * 2. HLS playlists (.m3u8) with automatic segment URL rewriting
 * 3. HLS segments (.ts, .aac, .m4s)
 */
app.get('/api/stream', (req: Request, res: Response): void => {
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    res.status(400).send('Missing url parameter');
    return;
  }

  // Set permissive CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    res.status(400).send('Invalid stream URL');
    return;
  }

  // Proxy request with redirect following
  proxyStreamRequest(targetUrl, req, res, 0);
});

/**
 * Generate M3U playlist file for external audio players
 */
app.get('/api/stream-playlist', (req: Request, res: Response): void => {
  const targetUrl = req.query.url as string;
  const channelName = (req.query.name as string) || 'Audio Stream';

  if (!targetUrl) {
    res.status(400).send('Missing url parameter');
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(channelName.replace(/[\/\\?%*:|"<>]/g, '_'))}.m3u"`
  );

  const m3uContent = `#EXTM3U\n#EXTINF:-1,${channelName}\n${targetUrl}\n`;
  res.send(m3uContent);
});

/**
 * جلب محتوى ملف قنوات M3U عبر رابط خارجي للرسيفر بدون مشاكل CORS
 */
app.get('/api/fetch-playlist', (req: Request, res: Response): void => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    res.status(400).json({ success: false, error: 'رابط غير صالح' });
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  function fetchUrlContent(fetchUrl: string, redirectCount = 0): void {
    if (redirectCount > 5) {
      res.status(502).json({ success: false, error: 'تجاوز عدد مرات التحويل (Too many redirects)' });
      return;
    }

    try {
      const urlObj = new URL(fetchUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const clientReq = client.get(
        fetchUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AudioCast/2.0',
            'Accept': '*/*',
          },
          timeout: 15000,
        },
        (upstreamRes) => {
          const statusCode = upstreamRes.statusCode || 200;
          if ([301, 302, 303, 307, 308].includes(statusCode) && upstreamRes.headers.location) {
            const redirectLoc = new URL(upstreamRes.headers.location, fetchUrl).href;
            fetchUrlContent(redirectLoc, redirectCount + 1);
            return;
          }

          let data = '';
          upstreamRes.setEncoding('utf8');
          upstreamRes.on('data', (chunk) => {
            data += chunk;
            // الحد الأقصى 4 ميجابايت لمنع استهلاك الذاكرة
            if (data.length > 4 * 1024 * 1024) {
              upstreamRes.destroy();
            }
          });

          upstreamRes.on('end', () => {
            res.json({ success: true, content: data });
          });
        }
      );

      clientReq.on('error', (err) => {
        res.status(502).json({ success: false, error: `فشل الاتصال: ${err.message}` });
      });

      clientReq.on('timeout', () => {
        clientReq.destroy();
        res.status(504).json({ success: false, error: 'انتهت مهلة الاتصال بالرابط (Timeout)' });
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: `رابط غير صالح: ${err?.message}` });
    }
  }

  fetchUrlContent(targetUrl);
});

app.options('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.sendStatus(204);
});

function proxyStreamRequest(
  streamUrl: string,
  req: Request,
  res: Response,
  redirectCount = 0
): void {
  if (redirectCount > 10) {
    if (!res.headersSent) {
      res.status(502).send('Too many redirects');
    }
    return;
  }

  let urlObj: URL;
  try {
    urlObj = new URL(streamUrl);
  } catch (err) {
    if (!res.headersSent) {
      res.status(400).send('Malformed URL in proxy');
    }
    return;
  }

  const isHttps = urlObj.protocol === 'https:';
  const client = isHttps ? https : http;

  const requestOptions: http.RequestOptions = {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Icy-MetaData': '0',
      Connection: 'keep-alive',
    },
    timeout: 25000,
    insecureHTTPParser: true,
    agent: isHttps
      ? new https.Agent({ rejectUnauthorized: false, keepAlive: true })
      : new http.Agent({ keepAlive: true }),
  };

  // Forward range header if present (important for audio/video seek and chunking)
  if (req.headers.range) {
    requestOptions.headers!['Range'] = req.headers.range;
  }

  const proxyReq = client.request(requestOptions, (upstreamRes) => {
    const statusCode = upstreamRes.statusCode || 200;

    // Handle redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(statusCode) && upstreamRes.headers.location) {
      const redirectLocation = new URL(upstreamRes.headers.location, streamUrl).href;
      upstreamRes.resume(); // Consume stream data to free memory
      proxyStreamRequest(redirectLocation, req, res, redirectCount + 1);
      return;
    }

    const contentType = upstreamRes.headers['content-type'] || 'audio/mpeg';

    // If client requested HEAD, return headers immediately without streaming body
    if (req.method === 'HEAD') {
      res.status(statusCode);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end();
      upstreamRes.destroy();
      return;
    }

    // Auto-detect Shoutcast status page returning HTML instead of stream:
    // If a URL like http://host:8000/ returns text/html, retry with /;
    if (
      statusCode === 200 &&
      contentType.includes('text/html') &&
      urlObj.port &&
      !streamUrl.includes(';') &&
      (urlObj.pathname === '/' || urlObj.pathname === '')
    ) {
      upstreamRes.resume();
      const shoutcastUrl = streamUrl.endsWith('/') ? `${streamUrl};` : `${streamUrl}/;`;
      console.log(`[Proxy] Detected Shoutcast HTML page, retrying with ${shoutcastUrl}`);
      proxyStreamRequest(shoutcastUrl, req, res, redirectCount + 1);
      return;
    }

    const isM3u8 =
      streamUrl.toLowerCase().includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl');

    // If it's an M3U8 playlist, rewrite URLs to route through proxy
    if (isM3u8) {
      let m3u8Body = '';
      upstreamRes.setEncoding('utf8');

      upstreamRes.on('data', (chunk) => {
        m3u8Body += chunk;
      });

      upstreamRes.on('end', () => {
        if (res.headersSent) return;

        // Rewrite relative and absolute URLs inside the playlist to go through /api/stream
        const rewritten = rewriteM3u8(m3u8Body, streamUrl);

        res.status(statusCode);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(rewritten);
      });

      upstreamRes.on('error', (err) => {
        console.warn('Error reading M3U8 upstream:', err);
        if (!res.headersSent) {
          res.status(502).send('Error reading playlist');
        }
      });
      return;
    }

    // Forward headers for direct audio / segment stream
    res.status(statusCode);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    if (upstreamRes.headers['content-length']) {
      res.setHeader('Content-Length', upstreamRes.headers['content-length']);
    }
    if (upstreamRes.headers['content-range']) {
      res.setHeader('Content-Range', upstreamRes.headers['content-range']);
    }

    // Pipe upstream audio directly to client
    upstreamRes.pipe(res);

    upstreamRes.on('error', (err) => {
      console.warn('Upstream stream error:', err);
      if (!res.headersSent) {
        res.status(502).end();
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.warn(`Stream proxy error for ${streamUrl}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to connect to stream server', details: err.message });
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 'Stream connection timed out' });
    }
  });

  // Clean up upstream connection when client closes tab/switches channel
  req.on('close', () => {
    proxyReq.destroy();
  });

  proxyReq.end();
}

/**
 * Rewrites URLs inside an M3U8 manifest so child playlists and .ts segments load via /api/stream
 */
function rewriteM3u8(content: string, manifestUrl: string): string {
  const lines = content.split('\n');
  const rewrittenLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      rewrittenLines.push(line);
      continue;
    }

    // If it's a URI in EXT-X-KEY or similar tag
    if (trimmed.startsWith('#EXT') && trimmed.includes('URI="')) {
      const match = trimmed.match(/URI="([^"]+)"/);
      if (match) {
        const originalUri = match[1];
        const absoluteUri = new URL(originalUri, manifestUrl).href;
        const proxiedUri = `/api/stream?url=${encodeURIComponent(absoluteUri)}`;
        rewrittenLines.push(line.replace(`URI="${originalUri}"`, `URI="${proxiedUri}"`));
        continue;
      }
    }

    // If it's a comment or tag, leave intact
    if (trimmed.startsWith('#')) {
      rewrittenLines.push(line);
      continue;
    }

    // This is a segment or sub-playlist URL
    try {
      const absoluteUrl = new URL(trimmed, manifestUrl).href;
      rewrittenLines.push(`/api/stream?url=${encodeURIComponent(absoluteUrl)}`);
    } catch {
      rewrittenLines.push(line);
    }
  }

  return rewrittenLines.join('\n');
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AudioCast audio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
