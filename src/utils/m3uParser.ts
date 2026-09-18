import { Channel } from '../types';

export interface ParseResult {
  success: boolean;
  channels: Channel[];
  error?: string;
  format?: 'm3u' | 'cfg' | 'txt' | 'urls';
}

/**
 * Clean and strip UTF-8 BOM, carriage returns, null bytes and control chars
 */
function cleanRawContent(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^\uFEFF/, '') // Remove UTF-8 Byte Order Mark
    .replace(/\0/g, '')     // Remove null bytes
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Comprehensive parser supporting:
 * 1. Standard M3U / M3U8 (#EXTM3U, #EXTINF)
 * 2. Non-standard M3U (files missing #EXTM3U header)
 * 3. CFG / INI formats (e.g. channel=name,url or [channel] or channel = "name", "url" or Name: URL)
 * 4. Plain TXT formats:
 *    - name, url
 *    - name; url
 *    - name | url
 *    - name = url
 *    - Raw list of direct streaming URLs (one per line)
 */
export function parsePlaylistFile(content: string, fileName = ''): ParseResult {
  if (!content || typeof content !== 'string') {
    return { success: false, channels: [], error: 'الملف غير صالح أو فارغ تماماً' };
  }

  const clean = cleanRawContent(content).trim();
  if (clean.length === 0) {
    return { success: false, channels: [], error: 'الملف المرفوع فارغ تماماً ولا يحتوي على أي أسطر' };
  }

  const lines = clean.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { success: false, channels: [], error: 'الملف لا يحتوي على أي محتوى قابل للقراءة' };
  }

  const lowerClean = clean.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  const tagChannels = (chs: Channel[]): Channel[] => {
    return chs.map((c, idx) => ({
      ...c,
      id: c.id || `file_${Date.now()}_${idx}`,
      origin: 'user_upload',
      engine: 'exoplayer',
      sourceFileName: fileName || c.sourceFileName || 'ملف صوتي',
    }));
  };

  // 1. Check if M3U format (#EXTINF or #EXTM3U or .m3u/.m3u8 extension)
  if (lowerClean.includes('#extinf') || lowerClean.includes('#extm3u') || lowerFileName.endsWith('.m3u') || lowerFileName.endsWith('.m3u8')) {
    const m3uChannels = parseM3ULines(lines);
    if (m3uChannels.length > 0) {
      return { success: true, channels: tagChannels(m3uChannels), format: 'm3u' };
    }
  }

  // 2. Check CFG / INI format (e.g. channel = name, url or [Section] or key = url)
  if (lowerFileName.endsWith('.cfg') || lowerFileName.endsWith('.ini') || clean.includes('=')) {
    const cfgChannels = parseCfgLines(lines);
    if (cfgChannels.length > 0) {
      return { success: true, channels: tagChannels(cfgChannels), format: 'cfg' };
    }
  }

  // 3. Check delimiter-separated TXT (comma, semicolon, colon, tab, pipe)
  const delimitedChannels = parseDelimitedLines(lines);
  if (delimitedChannels.length > 0) {
    return { success: true, channels: tagChannels(delimitedChannels), format: 'txt' };
  }

  // 4. Check Alternating Lines format (Line 1: Channel Name, Line 2: Stream URL)
  const alternatingChannels = parseAlternatingLines(lines);
  if (alternatingChannels.length > 0) {
    return { success: true, channels: tagChannels(alternatingChannels), format: 'txt' };
  }

  // 5. Check if lines contain #EXTINF even if no extension or header
  const looseM3U = parseM3ULines(lines);
  if (looseM3U.length > 0) {
    return { success: true, channels: tagChannels(looseM3U), format: 'm3u' };
  }

  // 6. Fallback: extract any valid URLs found in file
  const urlChannels = parseRawUrls(lines);
  if (urlChannels.length > 0) {
    return { success: true, channels: tagChannels(urlChannels), format: 'urls' };
  }

  return {
    success: false,
    channels: [],
    error: 'لم يتم العثور على أي روابط قنوات داخل الملف. تأكد من احتواء الملف على روابط تبدأ بـ http:// أو https:// (صيغ مدعومة: M3U, TXT, CFG)',
  };
}

/**
 * Standard & Loose M3U Parser
 * Accurately extracts channel name from #EXTINF:-1,Channel Name
 * and assigns the next stream URL http://stream.example.com/live
 */
function parseM3ULines(lines: string[]): Channel[] {
  const channels: Channel[] = [];
  let currentName = '';
  let currentLogo: string | undefined = undefined;
  let currentGroup: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();

    if (lowerLine.startsWith('#extm3u')) {
      continue;
    }

    if (lowerLine.startsWith('#extinf')) {
      // e.g., #EXTINF:-1,Radio Stream
      // e.g., #EXTINF:-1 tvg-logo="https://..." group-title="Live",Radio Stream
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentName = line.substring(commaIndex + 1).trim().replace(/^["']|["']$/g, '');
      } else {
        const match = line.match(/^#extinf:[^, ]*\s+(.+)$/i);
        currentName = match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
      }

      // Fallback name from tvg-name if empty
      if (!currentName || currentName === 'قناة بدون اسم') {
        const nameMatch = line.match(/tvg-name="([^"]+)"/i);
        if (nameMatch) {
          currentName = nameMatch[1].trim();
        }
      }

      // tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || line.match(/logo="([^"]+)"/i);
      currentLogo = logoMatch ? logoMatch[1].trim() : undefined;

      // group-title
      const groupMatch = line.match(/group-title="([^"]+)"/i) || line.match(/group="([^"]+)"/i);
      currentGroup = groupMatch ? groupMatch[1].trim() : undefined;
    } else if (!line.startsWith('#')) {
      const cleanUrl = line.trim().replace(/^["']|["']$/g, '');
      if (isValidStreamUrl(cleanUrl)) {
        const name = currentName || `قناة ${channels.length + 1}`;
        channels.push({
          id: `ch_${Date.now()}_${channels.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          url: cleanUrl,
          logo: currentLogo,
          group: currentGroup,
        });
      }
      currentName = '';
      currentLogo = undefined;
      currentGroup = undefined;
    }
  }

  return channels;
}

/**
 * Alternating Lines Parser (Line 1: Channel Name, Line 2: Stream URL)
 */
function parseAlternatingLines(lines: string[]): Channel[] {
  const channels: Channel[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1].trim().replace(/^["']|["']$/g, '');

    if (
      line &&
      !line.startsWith('#') &&
      !isValidStreamUrl(line) &&
      isValidStreamUrl(nextLine)
    ) {
      const cleanName = line.replace(/^[0-9]+[\.\-\)\:]\s*/, '').trim().replace(/^["']|["']$/g, '');
      channels.push({
        id: `alt_${Date.now()}_${channels.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName || `قناة ${channels.length + 1}`,
        url: nextLine,
      });
      i++; // skip nextLine since it was consumed as URL
    }
  }

  return channels;
}

/**
 * CFG / INI Parser
 * Supports:
 * ChannelName = http://stream.url
 * channel = "ChannelName", "http://stream.url"
 * [ChannelName] url = http://...
 */
function parseCfgLines(lines: string[]): Channel[] {
  const channels: Channel[] = [];
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Section header [Radio News]
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).trim();
      continue;
    }

    // Key=Value
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.substring(0, eqIdx).trim();
      const value = line.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

      // Check if value is a URL
      if (isValidStreamUrl(value)) {
        const name = currentSection || key || `قناة ${channels.length + 1}`;
        channels.push({
          id: `cfg_${Date.now()}_${channels.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          url: value,
          group: currentSection || 'CFG',
        });
        currentSection = '';
        continue;
      }

      // Check if value contains "name", "url"
      if (value.includes(',') || value.includes('|')) {
        const parts = value.split(/[,|]/).map((s) => s.trim().replace(/^["']|["']$/g, ''));
        const foundUrl = parts.find(isValidStreamUrl);
        const foundName = parts.find((p) => p !== foundUrl);
        if (foundUrl) {
          channels.push({
            id: `cfg_${Date.now()}_${channels.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
            name: foundName || key || `قناة ${channels.length + 1}`,
            url: foundUrl,
            group: 'CFG',
          });
          continue;
        }
      }
    }
  }

  return channels;
}

/**
 * Delimited TXT Parser (Comma, Pipe, Semicolon, Tab, Colon)
 * Format: Name, URL  OR  Name: URL  OR  URL, Name
 */
function parseDelimitedLines(lines: string[]): Channel[] {
  const channels: Channel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // 1. Check Name: http://... (colon separator before URL)
    const colonMatch = line.match(/^([^:]+?)\s*:\s*(https?:\/\/.+)$/i);
    if (colonMatch) {
      const name = colonMatch[1].trim().replace(/^["']|["']$/g, '');
      const url = colonMatch[2].trim().replace(/^["']|["']$/g, '');
      if (isValidStreamUrl(url)) {
        channels.push({
          id: `txt_${Date.now()}_${channels.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
          name: name || `قناة ${channels.length + 1}`,
          url,
        });
        continue;
      }
    }

    // 2. Check common delimiters: comma, pipe, semicolon, tab
    let delimiter: string | null = null;
    if (line.includes('|')) delimiter = '|';
    else if (line.includes(',')) delimiter = ',';
    else if (line.includes(';')) delimiter = ';';
    else if (line.includes('\t')) delimiter = '\t';

    if (delimiter) {
      const parts = line.split(delimiter).map((s) => s.trim().replace(/^["']|["']$/g, ''));
      const urlIndex = parts.findIndex(isValidStreamUrl);

      if (urlIndex !== -1) {
        const url = parts[urlIndex];
        const otherParts = parts.filter((_, idx) => idx !== urlIndex).filter(Boolean);
        const name = otherParts[0] || `قناة ${channels.length + 1}`;
        const group = otherParts[1] || undefined;

        channels.push({
          id: `txt_${Date.now()}_${channels.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          url,
          group,
        });
      }
    }
  }

  return channels;
}

/**
 * Raw URLs fallback
 */
function parseRawUrls(lines: string[]): Channel[] {
  const channels: Channel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isValidStreamUrl(line)) {
      channels.push({
        id: `raw_${Date.now()}_${channels.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
        name: `قناة صوتية ${channels.length + 1}`,
        url: line,
      });
    }
  }

  return channels;
}

/**
 * Validate stream URL
 */
export function isValidStreamUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('rtmp://') ||
    clean.startsWith('mmsh://') ||
    clean.startsWith('rtsp://')
  );
}

// Backward compatibility helper
export function parseM3U(content: string, fileName = ''): ParseResult {
  return parsePlaylistFile(content, fileName);
}

// Built-in sample channels (verified live audio streams)
export const DEFAULT_SAMPLE_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://www.9090.fm/images/logo.png" group-title="إذاعات مصر",الراديو 9090 FM مصر (El Radio 9090)
https://9090video.mobtada.com/hls/stream.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png" group-title="إذاعات إسلامية",إذاعة الشيخ أحمد العجمي (قرآن كريم)
https://backup.qurango.net/radio/ahmad_alajmy
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png" group-title="إذاعات إسلامية",إذاعة الشيخ إبراهيم الأخضر (قرآن كريم)
https://backup.qurango.net/radio/ibrahim_alakdar
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png" group-title="إذاعات إسلامية",إذاعة صحيح البخاري
https://backup.qurango.net/radio/saheh-bokharee
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png" group-title="إذاعات إسلامية",إذاعة قصص الأنبياء
https://backup.qurango.net/radio/alanbiya
#EXTINF:-1 tvg-logo="https://i.imgur.com/CiA3plN.png" group-title="قنوات وبث مباشر",بث إم بي سي مصر (MBC 1 Egypt Live Audio)
https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1-na/eec141533c90dd34722c503a296dd0d8/index.m3u8
`;
