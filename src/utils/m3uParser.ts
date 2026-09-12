import { Channel } from '../types';

export interface ParseResult {
  success: boolean;
  channels: Channel[];
  error?: string;
}

export function parseM3U(content: string): ParseResult {
  if (!content || typeof content !== 'string') {
    return { success: false, channels: [], error: 'الملف مش سليم' };
  }

  const cleanContent = content.trim();
  if (cleanContent.length === 0) {
    return { success: false, channels: [], error: 'الملف مش سليم' };
  }

  const lines = cleanContent.split(/\r?\n/);
  const channels: Channel[] = [];

  let currentName = '';
  let currentLogo: string | undefined = undefined;
  let currentGroup: string | undefined = undefined;
  let hasExtM3uHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      hasExtM3uHeader = true;
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF attributes
      // e.g., #EXTINF:-1 tvg-id="1" tvg-name="Quran Radio" tvg-logo="https://..." group-title="Quran",إذاعة القرآن الكريم
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentName = line.substring(commaIndex + 1).trim();
      } else {
        currentName = 'قناة بدون اسم';
      }

      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      currentLogo = logoMatch ? logoMatch[1] : undefined;

      // Extract group-title
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      currentGroup = groupMatch ? groupMatch[1] : undefined;

      // Extract tvg-name fallback
      if (!currentName) {
        const nameMatch = line.match(/tvg-name="([^"]+)"/i);
        if (nameMatch) {
          currentName = nameMatch[1];
        }
      }
    } else if (!line.startsWith('#')) {
      // It's a stream URL
      if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://') || line.startsWith('mmsh://')) {
        const name = currentName || `قناة ${channels.length + 1}`;
        channels.push({
          id: `ch_${channels.length + 1}_${Math.random().toString(36).substring(2, 7)}`,
          name,
          url: line,
          logo: currentLogo,
          group: currentGroup,
        });
      }
      // Reset current values for next channel
      currentName = '';
      currentLogo = undefined;
      currentGroup = undefined;
    }
  }

  // If no channels were parsed, or file didn't have valid channels
  if (channels.length === 0) {
    return {
      success: false,
      channels: [],
      error: 'الملف مش سليم',
    };
  }

  return {
    success: true,
    channels,
  };
}

// Built-in sample M3U file (Quran radios, public news & audio streams that are reliably online)
export const DEFAULT_SAMPLE_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png" group-title="إذاعات إسلامية",إذاعة القرآن الكريم - القاهرة
https://n02.radiojar.com/8s5u82pmwtzuv?rj-ttl=5&rj-tok=AAABmQ...
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/2/2f/BBC_Arabic_logo.svg" group-title="أخبار",بي بي سي عربي (BBC Arabic Audio)
https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio
#EXTINF:-1 tvg-logo="https://aljazeera.net/favicon.ico" group-title="أخبار",الجزيرة صوتية مباشر (Al Jazeera Audio)
https://live-audio-stream.aljazeera.net/audio/aljazeera
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/monte-carlo.png" group-title="إذاعات عامة",مونت كارلو الدولية (MCD)
https://montecarlodoualiya128k.streamakaci.com/mcd.mp3
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/freetv-app/logos/master/images/skynewsarabia.png" group-title="أخبار",سكاي نيوز عربية (Sky News Arabia)
https://stream.skynewsarabia.com/hls/audio/64k/prog_index.m3u8
#EXTINF:-1 group-title="إذاعات إسلامية",إذاعة القرآن الكريم - مكة المكرمة
https://qurango.net/radio/tarteel
`;
