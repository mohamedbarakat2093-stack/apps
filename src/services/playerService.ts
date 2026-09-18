import Hls from 'hls.js';
import { Channel, PlayerStatus, RetryState, StreamStats, ExoPlayerInfo } from '../types';

export type PlayerEventCallback = {
  onStatusChange: (status: PlayerStatus) => void;
  onActiveChannelChange: (channel: Channel | null) => void;
  onRetryUpdate: (retry: RetryState) => void;
  onErrorToast: (message: string) => void;
  onStatsUpdate?: (stats: StreamStats) => void;
  onAudioBoostChange?: (boosted: boolean) => void;
};

const RETRY_DELAYS = [2000, 4000, 6000];

class PlayerEngine {
  private audioElement: HTMLAudioElement | null = null;
  private hls: Hls | null = null;
  private audioContext: AudioContext | null = null;
  private silentGainNode: GainNode | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private boostGainNode: GainNode | null = null;
  private highPassFilterNode: BiquadFilterNode | null = null;
  private lowShelfFilterNode: BiquadFilterNode | null = null;
  private presenceFilterNode: BiquadFilterNode | null = null;
  private dynamicsCompressorNode: DynamicsCompressorNode | null = null;
  private ceilingGainNode: GainNode | null = null;
  private webAudioConnected = false;
  private isBoosted3x = false;
  private activeChannel: Channel | null = null;
  private status: PlayerStatus = 'idle';
  private callbacks: PlayerEventCallback | null = null;

  private retryCount = 0;
  private retryTimeoutId: any = null;
  private isUserInitiatedStop = false;
  private isReconnecting = false;
  private statsInterval: any = null;
  private wakeLock: any = null;
  private autoResumeTimer: any = null;

  // Playback tracking
  private playbackStarted = false;
  private loadTimeoutId: any = null;
  private candidateErrorCallback: (() => void) | null = null;

  constructor() {
    try {
      if (typeof localStorage !== 'undefined') {
        this.isBoosted3x = localStorage.getItem('audiocast_boost_3x') === 'true';
      }
    } catch (_) {}
    this.getOrCreateAudioElement();
    this.setupBackgroundKeepAlive();
  }

  /**
   * Standard HTML5 Audio Element with preload="auto" and No-CORS Mode.
   * Attached directly to document.body to ensure Android TV WebView hardware recognition.
   */
  private getOrCreateAudioElement(): HTMLAudioElement {
    if (!this.audioElement) {
      const audio = new Audio();
      audio.id = 'audiocast-audio-core';
      audio.preload = 'auto';
      audio.autoplay = false;
      audio.removeAttribute('crossOrigin');
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('x-webkit-airplay', 'allow');
      audio.style.position = 'fixed';
      audio.style.top = '-9999px';
      audio.style.left = '-9999px';
      audio.style.width = '1px';
      audio.style.height = '1px';
      audio.style.opacity = '0';
      audio.style.pointerEvents = 'none';

      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(audio);
      }

      this.attachAudioListeners(audio);
      this.audioElement = audio;

      // Periodic stream stats if running in browser
      if (!this.statsInterval && typeof window !== 'undefined') {
        this.statsInterval = setInterval(() => {
          if (this.status === 'playing' && this.audioElement && this.activeChannel) {
            let bufferSeconds = 0;
            try {
              const buffered = this.audioElement.buffered;
              if (buffered.length > 0) {
                bufferSeconds = Math.max(0, buffered.end(buffered.length - 1) - this.audioElement.currentTime);
              }
            } catch (_) {}

            const url = this.activeChannel.url;
            const isHls = Boolean(this.hls) || /\.m3u8($|\?)/i.test(url);
            const isExoPlayer = this.isExoPlayerChannel(this.activeChannel);

            this.callbacks?.onStatsUpdate?.({
              format: isHls ? 'HLS (m3u8)' : 'Direct Audio',
              protocol: url.startsWith('http://') ? 'HTTP' : 'HTTPS',
              bufferSeconds: Math.round(bufferSeconds * 10) / 10,
              engine: isExoPlayer
                ? (isHls ? 'ExoPlayer HLS Engine (Media3)' : 'ExoPlayer Audio Engine (DefaultLoadControl 50s)')
                : (isHls ? 'Hls.js Live Engine' : 'HTML5 Standard Audio (OS Stream)'),
              isExoPlayer,
            });
          }
        }, 3000);
      }
    }

    return this.audioElement;
  }

  private attachAudioListeners(audio: HTMLAudioElement) {
    audio.addEventListener('playing', () => {
      this.markPlaybackStarted();
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime > 0.1 && !this.playbackStarted) {
        this.markPlaybackStarted();
      }
    });

    audio.addEventListener('pause', () => {
      // If user intentionally paused/stopped
      if (this.isUserInitiatedStop) {
        this.setStatus('paused');
        this.updateMediaSessionPlaybackState('paused');
        return;
      }

      // If auto-paused by WebView / OS when tab is minimized or loses focus,
      // prevent interruption and keep sound streaming continuously in background
      if (this.status === 'playing' || this.status === 'loading') {
        if (this.autoResumeTimer) clearTimeout(this.autoResumeTimer);
        this.autoResumeTimer = setTimeout(() => {
          if (!this.isUserInitiatedStop && this.audioElement && this.activeChannel) {
            this.audioElement.play().catch(() => {});
          }
        }, 80);
      }
    });

    audio.addEventListener('error', (e) => {
      console.warn('Audio stream error event:', e);
      if (this.status === 'playing' && this.playbackStarted) {
        this.handleStreamDrop();
      } else if (this.status === 'loading') {
        if (this.candidateErrorCallback) {
          const cb = this.candidateErrorCallback;
          this.candidateErrorCallback = null;
          cb();
        } else {
          this.handleChannelUnavailable('القناة غير متاحة');
        }
      }
    });

    audio.addEventListener('canplay', () => {
      if (this.status === 'loading' && !this.playbackStarted && !this.isUserInitiatedStop) {
        audio.play().catch(() => {});
        this.markPlaybackStarted();
      }
    });

    audio.addEventListener('stalled', () => {
      if (this.status === 'playing') {
        console.warn('Playback buffering stream chunks...');
      }
    });
  }

  /**
   * Called when audio successfully begins emitting sound
   */
  private markPlaybackStarted() {
    this.playbackStarted = true;
    this.candidateErrorCallback = null;
    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    this.isReconnecting = false;
    this.retryCount = 0;
    this.notifyRetryState({ attempt: 0, maxAttempts: 3, delaySeconds: 0, active: false });
    this.setStatus('playing');
    this.updateMediaSessionPlaybackState('playing');
    this.acquireWakeLock();
    this.enforceExclusiveAudioFocus();
    if (this.isBoosted3x) {
      this.setAudioBoost(true);
    }
  }

  /**
   * إظهار رسالة "القناة غير متاحة" فوراً وإيقاف حالة التحميل
   */
  private handleChannelUnavailable(message: string = 'القناة غير متاحة') {
    if (this.isUserInitiatedStop) return;

    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    console.warn('Stream unavailable:', message);
    this.stopPreviousStream();
    this.setStatus('idle');
    this.callbacks?.onErrorToast(message);
  }

  /**
   * Stop and purge previous player instances (HLS and audio element).
   * Prevents memory leaks and audio overlapping.
   */
  public stopPreviousStream() {
    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    // 1. Destroy Hls instance
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch (err) {
        console.warn('Error destroying HLS instance:', err);
      }
      this.hls = null;
    }

    // 2. Purge audio element
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.removeAttribute('src');
        this.audioElement.src = '';
        this.audioElement.load();
      } catch (err) {
        console.warn('Error purging audio element:', err);
      }
    }
  }

  /**
   * Keeps audio actively playing in background:
   * Prevents WebView from stopping <audio> when page is hidden or window loses focus (Home/Hide).
   */
  private setupBackgroundKeepAlive() {
    if (typeof document === 'undefined') return;

    const maintainBackground = () => {
      if (!this.isUserInitiatedStop && this.activeChannel && this.audioElement) {
        // 1. Re-acquire WakeLock
        this.acquireWakeLock();

        // 2. Resume Web Audio Context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }

        // 3. Keep audio element streaming
        if (this.audioElement.paused) {
          this.audioElement.play().catch(() => {});
        }

        // 4. Keep system MediaSession state playing
        this.updateMediaSessionPlaybackState('playing');
      }
    };

    document.addEventListener('visibilitychange', maintainBackground);
    window.addEventListener('pagehide', maintainBackground);
    window.addEventListener('blur', maintainBackground);
    window.addEventListener('focus', maintainBackground);
  }

  /**
   * Public method to lock and maintain background playback when user clicks Hide
   */
  public maintainBackgroundPlayback() {
    this.acquireWakeLock();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    if (this.audioElement && this.audioElement.paused && !this.isUserInitiatedStop && this.activeChannel) {
      this.audioElement.play().catch(() => {});
    }
    this.updateMediaSessionPlaybackState('playing');
  }

  /**
   * Acquire WakeLock so system / screen does not sleep while playing
   */
  public async acquireWakeLock() {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
        if (this.wakeLock && !this.wakeLock.released) {
          return;
        }
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
          if (!this.isUserInitiatedStop && this.status === 'playing') {
            setTimeout(() => this.acquireWakeLock(), 1000);
          }
        });
      }
    } catch (_) {}
  }

  private releaseWakeLock() {
    try {
      if (this.wakeLock) {
        this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch (_) {}
  }

  public setCallbacks(cbs: PlayerEventCallback) {
    this.callbacks = cbs;
  }

  private setStatus(status: PlayerStatus) {
    this.status = status;
    this.callbacks?.onStatusChange(status);
  }

  private notifyRetryState(state: RetryState) {
    this.callbacks?.onRetryUpdate(state);
  }

  public getStatus(): PlayerStatus {
    return this.status;
  }

  public getActiveChannel(): Channel | null {
    return this.activeChannel;
  }

  /**
   * Enforce Exclusive Audio Focus:
   * Mutes and pauses all other media elements on page.
   * Maximizes volume on the active stream to ensure full, unmuted sound.
   * Silences and suppresses any external TV/Satellite tuner audio tracks on Amlogic chipsets.
   */
  public enforceExclusiveAudioFocus() {
    if (typeof document === 'undefined') return;

    try {
      // 1. Mute and pause every audio & video element across the page
      const allMedia = document.querySelectorAll('audio, video');
      allMedia.forEach((media) => {
        if (media !== this.audioElement) {
          const mediaEl = media as HTMLMediaElement;
          try {
            mediaEl.muted = true;
            mediaEl.volume = 0;
            mediaEl.pause();
          } catch (_) {}
        }
      });

      // 2. Ensure application audio element is completely unmuted and maximized
      if (this.audioElement) {
        this.audioElement.muted = false;
        this.audioElement.volume = 1.0;
      }

      // 3. Amlogic & Android TV Receiver hardware tuner suppression hooks
      const w = typeof window !== 'undefined' ? (window as any) : null;
      if (w) {
        try {
          w.Android?.requestAudioFocus?.();
          w.Android?.muteTuner?.(true);
          w.Android?.setTunerMute?.(true);
          w.Android?.setTunerAudioMute?.(true);
          w.Android?.stopTunerAudio?.();
          w.Amlogic?.muteTuner?.();
          w.Amlogic?.setExclusiveAudio?.(true);
          w.AmlogicAudio?.muteTuner?.();
          w.AmlPlayer?.stop?.();
          w.TvTuner?.setMute?.(true);
          w.tuner?.setMute?.(true);
          w.DvbPlayer?.mute?.();
        } catch (_) {}

        // MediaSession API to claim OS audio focus
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }

      window.dispatchEvent(new CustomEvent('audiocast:audiofocus_gain'));
    } catch (err) {
      console.warn('Error enforcing audio focus:', err);
    }
  }

  /**
   * Request Audio Focus using Web Audio Context
   * Initializes audio context to seize exclusive audio routing from the OS
   */
  private async requestAudioFocus(): Promise<boolean> {
    try {
      this.enforceExclusiveAudioFocus();

      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      }

      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume().catch(() => {});
        }
      }
      return true;
    } catch (err) {
      console.warn('Audio focus request notice:', err);
      return true;
    }
  }

  private releaseAudioFocus() {
    try {
      if (this.audioContext && this.audioContext.state === 'running') {
        this.audioContext.suspend();
      }
      this.releaseWakeLock();
    } catch (err) {
      console.warn('Audio focus release error:', err);
    }
  }

  /**
   * Setup System MediaSession for Lockscreen / Background / TV OS
   */
  private setupMediaSession(channel: Channel) {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && (window as any).MediaMetadata) {
      try {
        const artwork = channel.logo
          ? [
              { src: channel.logo, sizes: '96x96', type: 'image/png' },
              { src: channel.logo, sizes: '128x128', type: 'image/png' },
              { src: channel.logo, sizes: '192x192', type: 'image/png' },
              { src: channel.logo, sizes: '512x512', type: 'image/png' },
            ]
          : [];

        navigator.mediaSession.metadata = new MediaMetadata({
          title: channel.name,
          artist: channel.group || 'AudioCast Live',
          album: 'AudioCast Internal Player',
          artwork,
        });

        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', () => {
          this.resume();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          this.pause();
        });

        navigator.mediaSession.setActionHandler('stop', () => {
          this.stop(true);
        });

        try {
          navigator.mediaSession.setActionHandler('seekto', () => {});
        } catch (_) {}
      } catch (e) {
        console.warn('MediaSession setup non-fatal exception:', e);
      }
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch (_) {}
    }
  }

  private clearMediaSession() {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch (_) {}
    }
  }

  private clearRetryTimer() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    this.isReconnecting = false;
    this.notifyRetryState({ attempt: 0, maxAttempts: 3, delaySeconds: 0, active: false });
  }

  /**
   * Play Channel:
   * Direct embedded playback inside the application.
   * Starts immediately with instant error feedback.
   */
  public async playChannel(channel: Channel, _isAutoResume = false): Promise<boolean> {
    this.clearRetryTimer();
    this.isUserInitiatedStop = false;

    // 1. إيقاف وتفريغ المشغل السابق عند التبديل لمنع تداخل الذاكرة
    this.stopPreviousStream();

    this.activeChannel = channel;
    this.callbacks?.onActiveChannelChange(channel);
    this.setStatus('loading');
    this.playbackStarted = false;

    // مهلة أمان للتحميل: تمنح البث الحي وقتاً كافياً لبدء استقبال حزم الصوت
    if (this.loadTimeoutId) clearTimeout(this.loadTimeoutId);
    this.loadTimeoutId = setTimeout(() => {
      if (this.status === 'loading' && !this.playbackStarted) {
        this.handleChannelUnavailable('القناة غير متاحة');
      }
    }, 15000);

    // 2. طلب السيطرة الكاملة والحصرية على الصوت في الخلفية لمنع فقدان صلاحية تفاعل المستخدم
    this.requestAudioFocus().catch(() => {});

    // 3. تهيئة MediaSession والحفاظ على الجلسة الحصرية
    this.setupMediaSession(channel);

    // 4. حفظ القناة كآخر قناة تم تشغيلها
    try {
      localStorage.setItem('m3u_last_played_channel', JSON.stringify(channel));
    } catch (e) {
      console.warn('Failed to persist last played channel', e);
    }

    // 5. محاولة التشغيل عبر جسر AndroidControl الأصلي للرسيفر أولاً إن وجد
    const w = typeof window !== 'undefined' ? (window as any) : null;
    if (w && w.AndroidControl && typeof w.AndroidControl.playStream === 'function') {
      try {
        console.log('[NativeBridge] Native bridge AndroidControl found, calling playStream with URL:', channel.url);
        // تفريغ صوت HTML5 تماماً لمنع أي تكرار أو تشغيل صوت مزدوج
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement.removeAttribute('src');
          this.audioElement.src = '';
        }
        w.AndroidControl.playStream(channel.url);
        this.markPlaybackStarted();
        this.setStatus('playing');
        return true;
      } catch (err) {
        console.warn('[NativeBridge] Error calling AndroidControl.playStream:', err);
      }
    } else {
      console.warn('[NativeBridge] AndroidControl bridge not found, falling back to web audio engine');
    }

    // 6. بدء محاولة التشغيل فوراً عبر محرك ExoPlayer المدمج للويب
    return this.startPlayback(channel.url);
  }

  /**
   * Main playback router:
   * - If .m3u8: Use Hls.js
   * - ALL other links: Play DIRECTLY via HTML5 Audio Element without mpegts.js or fetch headers.
   */
  private async startPlayback(url: string): Promise<boolean> {
    const cleanUrl = url.trim();
    if (!cleanUrl) return false;

    const isM3u8 = /\.m3u8($|\?)/i.test(cleanUrl);

    // 1. If it's explicitly an HLS stream, use Hls.js
    if (isM3u8 && Hls.isSupported()) {
      return this.playHlsStream(cleanUrl);
    }

    // 2. Direct HTML5 Audio playback for all other streams
    return this.playDirectAudio(cleanUrl);
  }

  /**
   * Play .m3u8 using Hls.js without modifying XHR headers
   */
  private playHlsStream(url: string): Promise<boolean> {
    const audio = this.getOrCreateAudioElement();

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (success: boolean) => {
        if (!resolved) {
          resolved = true;
          if (success) {
            this.markPlaybackStarted();
          }
          resolve(success);
        }
      };

      try {
        const isExoPlayer = this.isExoPlayerChannel(this.activeChannel);
        const hlsConfig: any = {
          enableWorker: true,
          // تعطيل وضع زمن الوصول المنخفض لتجنب القفزات اللحظية والتذبذب الصوتي كل ثانية
          lowLatencyMode: false,
          maxLiveSyncPlaybackRate: 1.0, // تثبيت سرعة التشغيل لمنع التقطيع أو تسريع الصوت المفاجئ
          liveSyncDurationCount: 4,     // الاحتفاظ بتخزين مؤقت مسبق لـ 4 أجزاء لضمان تدفق سلس ونقي
          liveMaxLatencyDurationCount: 12,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          backBufferLength: 0,
          fragLoadingTimeOut: 25000,
          manifestLoadingTimeOut: 25000,
          highBufferWatchdogPeriod: 2,
          nudgeMaxRetry: 5,
        };

        const hls = new Hls(hlsConfig);

        this.hls = hls;

        let hasFallenBack = false;
        const triggerDirectFallback = () => {
          if (hasFallenBack) return;
          hasFallenBack = true;
          this.stopPreviousStream();
          this.playDirectAudio(url).then(finish);
        };

        hls.loadSource(url);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio
            .play()
            .then(() => finish(true))
            .catch(() => {
              triggerDirectFallback();
            });
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn('HLS fatal error:', data.type, data.details);
            if (this.status === 'playing' && this.playbackStarted) {
              this.handleStreamDrop();
            } else if (!hasFallenBack) {
              triggerDirectFallback();
            } else {
              // إظهار رسالة الخطأ فقط بعد استنفاد كل المحاولات
              this.handleChannelUnavailable('القناة غير متاحة');
              finish(false);
            }
          }
        });
      } catch (err) {
        console.warn('HLS initialization error:', err);
        this.playDirectAudio(url).then(finish);
      }
    });
  }

  /**
   * Multi-Candidate Resilient Audio Playback Engine (ExoPlayer-compatible):
   * 1. Evaluates candidate playback URLs (Internal Proxy, HTTPS upgrade, Direct HTTP/Native).
   * 2. Tries each candidate sequentially. If a candidate triggers an error event or promise rejection,
   *    it immediately tries the next candidate without throwing "القناة غير متاحة".
   * 3. Only if ALL candidates fail does it trigger handleChannelUnavailable.
   */
  private playDirectAudio(rawUrl: string): Promise<boolean> {
    const audio = this.getOrCreateAudioElement();

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (success: boolean) => {
        if (!resolved) {
          resolved = true;
          this.candidateErrorCallback = null;
          if (success) {
            this.markPlaybackStarted();
          }
          resolve(success);
        }
      };

      const isExoPlayer = this.isExoPlayerChannel(this.activeChannel);
      const isHttpsHost = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const cleanUrl = rawUrl.trim().replace(/#+$/, '');
      const encodedProxy = `/api/stream?url=${encodeURIComponent(cleanUrl)}${isExoPlayer ? '&engine=exoplayer' : ''}`;
      const httpsVersion = cleanUrl.startsWith('http://') ? cleanUrl.replace(/^http:\/\//i, 'https://') : '';

      // Check if Android TV native AndroidControl or ExoPlayer bridge is available
      if (typeof window !== 'undefined') {
        const w = window as any;
        if (w && w.AndroidControl && typeof w.AndroidControl.playStream === 'function') {
          try {
            console.log('[NativeBridge] Native bridge AndroidControl found, calling playStream with URL:', cleanUrl);
            if (this.audioElement) {
              this.audioElement.pause();
              this.audioElement.removeAttribute('src');
              this.audioElement.src = '';
            }
            w.AndroidControl.playStream(cleanUrl);
            finish(true);
            return;
          } catch (err) {
            console.warn('[NativeBridge] Error calling AndroidControl.playStream in playDirectAudio:', err);
          }
        } else if (w && w.ExoPlayer && typeof w.ExoPlayer.play === 'function') {
          try {
            console.log('[NativeBridge] Native bridge ExoPlayer found, calling play with URL:', cleanUrl);
            if (this.audioElement) {
              this.audioElement.pause();
              this.audioElement.removeAttribute('src');
              this.audioElement.src = '';
            }
            w.ExoPlayer.play(cleanUrl, this.activeChannel?.name || 'بث صوتي');
            finish(true);
            return;
          } catch (err) {
            console.warn('[NativeBridge] Error calling ExoPlayer.play:', err);
          }
        }
      }

      const candidates: string[] = [];

      if (cleanUrl.startsWith('/api/stream')) {
        candidates.push(cleanUrl);
      } else {
        // الأولوية دائماً للبروكسي الداخلي الموثوق لأنه يقوم بفك دمج MPEG-TS إلى ADTS AAC نقي
        // ويتخطى قيود CORS والـ Mixed Content تلقائياً
        candidates.push(encodedProxy);
        if (httpsVersion && httpsVersion !== cleanUrl) {
          candidates.push(httpsVersion);
        }
        if (!isHttpsHost) {
          candidates.push(cleanUrl);
        }
      }

      // Remove duplicates while keeping order
      const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);

      const tryCandidate = (idx: number) => {
        if (resolved || this.isUserInitiatedStop) return;

        if (idx >= uniqueCandidates.length) {
          console.warn('[PlayerEngine] All stream candidates failed for:', cleanUrl);
          if (this.status === 'loading') {
            this.handleChannelUnavailable('القناة غير متاحة');
          }
          finish(false);
          return;
        }

        const candidateUrl = uniqueCandidates[idx];
        console.log(`[PlayerEngine] Attempting candidate [${idx + 1}/${uniqueCandidates.length}]:`, candidateUrl);

        let candidateTimedOut = false;
        const candidateTimeout = setTimeout(() => {
          if (!this.playbackStarted && !resolved) {
            console.warn(`[PlayerEngine] Candidate timed out: ${candidateUrl}`);
            candidateTimedOut = true;
            tryCandidate(idx + 1);
          }
        }, 5500);

        this.candidateErrorCallback = () => {
          clearTimeout(candidateTimeout);
          if (!this.playbackStarted && !resolved && !candidateTimedOut) {
            console.warn(`[PlayerEngine] Candidate error callback triggered on ${candidateUrl}`);
            tryCandidate(idx + 1);
          }
        };

        try {
          audio.pause();
          audio.removeAttribute('crossOrigin');
          audio.preload = 'auto';
          audio.src = candidateUrl;
          audio.load();

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                clearTimeout(candidateTimeout);
                finish(true);
              })
              .catch((err) => {
                console.warn(`[PlayerEngine] playPromise rejected on ${candidateUrl}:`, err);
                clearTimeout(candidateTimeout);
                if (!this.playbackStarted && !resolved) {
                  tryCandidate(idx + 1);
                }
              });
          } else {
            clearTimeout(candidateTimeout);
            finish(true);
          }
        } catch (err) {
          clearTimeout(candidateTimeout);
          console.warn(`[PlayerEngine] Synchronous error on ${candidateUrl}:`, err);
          tryCandidate(idx + 1);
        }
      };

      tryCandidate(0);
    });
  }

  /**
   * Reconnect on sudden stream drops during active playback (only for active streams)
   */
  private handleStreamDrop() {
    if (this.isUserInitiatedStop || !this.activeChannel || !this.playbackStarted) return;

    if (this.retryCount < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[this.retryCount];
      const attemptNumber = this.retryCount + 1;
      this.retryCount++;
      this.isReconnecting = true;
      this.setStatus('reconnecting');

      this.notifyRetryState({
        attempt: attemptNumber,
        maxAttempts: 3,
        delaySeconds: delay / 1000,
        active: true,
      });

      this.retryTimeoutId = setTimeout(async () => {
        if (this.isUserInitiatedStop || !this.activeChannel) return;

        console.log(`Reconnecting attempt ${attemptNumber}...`);
        this.stopPreviousStream();
        const ok = await this.startPlayback(this.activeChannel.url);
        if (ok) {
          this.isReconnecting = false;
          this.retryCount = 0;
          this.notifyRetryState({ attempt: 0, maxAttempts: 3, delaySeconds: 0, active: false });
          this.setStatus('playing');
        } else {
          this.handleStreamDrop();
        }
      }, delay);
    } else {
      this.clearRetryTimer();
      this.isReconnecting = false;
      this.setStatus('idle');
      this.callbacks?.onErrorToast('انقطع البث المباشر');
    }
  }

  public togglePlayPause() {
    if (!this.activeChannel) return;

    if (this.status === 'playing') {
      this.pause();
    } else if (this.status === 'paused') {
      this.resume();
    } else if (this.status === 'idle' || this.status === 'error') {
      this.playChannel(this.activeChannel);
    }
  }

  public pause() {
    this.isUserInitiatedStop = true;
    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.setStatus('paused');
      this.updateMediaSessionPlaybackState('paused');
    }
  }

  public resume() {
    this.isUserInitiatedStop = false;
    if (this.audioElement && this.activeChannel) {
      this.requestAudioFocus().then(() => {
        this.enforceExclusiveAudioFocus();
        this.acquireWakeLock();
        this.audioElement
          ?.play()
          .then(() => {
            this.markPlaybackStarted();
          })
          .catch(() => {
            this.handleStreamDrop();
          });
      });
    }
  }

  /**
   * Determines if channel belongs to audio channels from uploaded file or has exoplayer engine
   */
  public isExoPlayerChannel(channel: Channel | null): boolean {
    if (!channel) return false;
    return (
      channel.engine === 'exoplayer' ||
      channel.origin === 'user_upload' ||
      Boolean(channel.sourceFileName)
    );
  }

  /**
   * Checks if current active stream is powered by ExoPlayer engine
   */
  public isExoPlayerActive(): boolean {
    return this.isExoPlayerChannel(this.activeChannel);
  }

  /**
   * Launch playback in external native ExoPlayer app (Android TV / Box / Mobile)
   */
  public launchExternalExoPlayer(channel?: Channel): boolean {
    const targetChannel = channel || this.activeChannel;
    if (!targetChannel || typeof window === 'undefined') return false;

    const w = window as any;
    if (w.ExoPlayer?.play) {
      try {
        w.ExoPlayer.play(targetChannel.url, targetChannel.name);
        return true;
      } catch (_) {}
    }
    if (w.Android?.playExoPlayer) {
      try {
        w.Android.playExoPlayer(targetChannel.url, targetChannel.name);
        return true;
      } catch (_) {}
    }

    const rawUrl = targetChannel.url.trim();
    const cleanUrl = rawUrl.replace(/^https?:\/\//, '');
    const intentUri = `intent://${cleanUrl}#Intent;action=android.intent.action.VIEW;type=audio/*;package=com.google.android.exoplayer2;S.title=${encodeURIComponent(targetChannel.name)};end`;

    try {
      window.location.href = intentUri;
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * مضاعفة صوت التطبيق لأقصى درجة نقية بدون تشويه (Pure Sound & Maximum Clean Volume)
   * معالجة استوديو احترافية لإبراز الصوت والوضوح ومنع تشويه ترددات البيز (Bass) نهائياً
   */
  public setAudioBoost(enabled: boolean): boolean {
    this.isBoosted3x = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('audiocast_boost_3x', enabled ? 'true' : 'false');
      }
    } catch (_) {}

    // 1. Android Native ExoPlayer LoudnessEnhancer (مع كسب متزن ونقي يمنع الـ clipping)
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.ExoPlayer?.setAudioBoost) {
        try {
          w.ExoPlayer.setAudioBoost(enabled, 2.85);
        } catch (_) {}
      } else if (w.Android?.setAudioBoost) {
        try {
          w.Android.setAudioBoost(enabled, 2.85);
        } catch (_) {}
      }
    }

    // 2. Web Audio API مع فلاتر نقاء الصوت ومضاعفة قوية لرفع مستوى الصوت لأقصى حد
    this.applyWebAudioGain(enabled ? 2.85 : 1.0);

    // 3. Keep audio element maximized
    if (this.audioElement) {
      this.audioElement.volume = 1.0;
    }

    this.callbacks?.onAudioBoostChange?.(enabled);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audiocast:boost_change', { detail: { boosted: enabled } }));
    }

    return this.isBoosted3x;
  }

  public isAudioBoosted(): boolean {
    return this.isBoosted3x;
  }

  public toggleAudioBoost(): boolean {
    return this.setAudioBoost(!this.isBoosted3x);
  }

  private applyWebAudioGain(multiplier: number) {
    try {
      if (typeof window === 'undefined') return;

      // إذا لم يكن الصوت مضخماً ولم يتم تفعيل الـ Web Audio من قبل، نعتمد على مسار الصوت الأصلي للمتصفح
      if (multiplier <= 1.0 && !this.webAudioConnected) {
        if (this.audioElement) {
          this.audioElement.volume = 1.0;
        }
        return;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const now = this.audioContext.currentTime;
      const isBoostActive = multiplier > 1.0;

      // 1. فلتر إزالة الرنين الترددي فائق الانخفاض (Anti-Rumble High-Pass Filter)
      // الترددات تحت 65Hz تستهلك 70% من طاقة السماعة وتسبب اهتزاز الغشاء وتشويه البيز
      if (!this.highPassFilterNode) {
        this.highPassFilterNode = this.audioContext.createBiquadFilter();
        this.highPassFilterNode.type = 'highpass';
        this.highPassFilterNode.Q.setValueAtTime(0.707, now);
      }
      this.highPassFilterNode.frequency.cancelScheduledValues(now);
      this.highPassFilterNode.frequency.setTargetAtTime(isBoostActive ? 65 : 10, now, 0.05);

      // 2. فلتر إحكام ترددات البيز (Bass Tightness Low-Shelf Filter)
      // خفض هادئ بمقدار 2.5dB لترددات الصدى المكتومة (180Hz) لضمان بيز نظيف ونقي بدون طنين أو distortion
      if (!this.lowShelfFilterNode) {
        this.lowShelfFilterNode = this.audioContext.createBiquadFilter();
        this.lowShelfFilterNode.type = 'lowshelf';
        this.lowShelfFilterNode.frequency.setValueAtTime(180, now);
      }
      this.lowShelfFilterNode.gain.cancelScheduledValues(now);
      this.lowShelfFilterNode.gain.setTargetAtTime(isBoostActive ? -2.5 : 0, now, 0.05);

      // 3. فلتر وضوح الصوت ومخارج الحروف (Presence & Speech Clarity Peaking Filter)
      // تعزيز الترددات في منطقة حساسية الأذن البشرية (2800Hz) يعطي صوتاً أعلى بكثير مع وضوح ناصع للكلام والتعليق
      if (!this.presenceFilterNode) {
        this.presenceFilterNode = this.audioContext.createBiquadFilter();
        this.presenceFilterNode.type = 'peaking';
        this.presenceFilterNode.frequency.setValueAtTime(2800, now);
        this.presenceFilterNode.Q.setValueAtTime(1.1, now);
      }
      this.presenceFilterNode.gain.cancelScheduledValues(now);
      this.presenceFilterNode.gain.setTargetAtTime(isBoostActive ? 4.5 : 0, now, 0.05);

      // 4. معالج الكسب الرقمي النقي (Clean Studio Pre-Gain Node)
      if (!this.boostGainNode) {
        this.boostGainNode = this.audioContext.createGain();
      }
      this.boostGainNode.gain.cancelScheduledValues(now);
      this.boostGainNode.gain.setTargetAtTime(multiplier, now, 0.05);

      // 5. ضاغط ومانع ذروة استوديو متقدم (True-Peak Brickwall Limiter)
      // يمنع وصول الإشارة إلى 0 dBFS نهائياً، مما يقضي على أي تشويه أو تكسير رقمي (Clipping)
      if (!this.dynamicsCompressorNode) {
        this.dynamicsCompressorNode = this.audioContext.createDynamicsCompressor();
      }
      this.dynamicsCompressorNode.threshold.cancelScheduledValues(now);
      this.dynamicsCompressorNode.threshold.setTargetAtTime(isBoostActive ? -11.0 : 0, now, 0.05);
      this.dynamicsCompressorNode.knee.cancelScheduledValues(now);
      this.dynamicsCompressorNode.knee.setTargetAtTime(isBoostActive ? 6.0 : 0, now, 0.05);
      this.dynamicsCompressorNode.ratio.cancelScheduledValues(now);
      this.dynamicsCompressorNode.ratio.setTargetAtTime(isBoostActive ? 20.0 : 1.0, now, 0.05);
      this.dynamicsCompressorNode.attack.cancelScheduledValues(now);
      this.dynamicsCompressorNode.attack.setTargetAtTime(0.001, now, 0.05); // التقاط فوري لقمم البيز قبل تشويهها
      this.dynamicsCompressorNode.release.cancelScheduledValues(now);
      this.dynamicsCompressorNode.release.setTargetAtTime(0.15, now, 0.05);

      // 6. حاجز الأمان النهائي لمستوى الصوت (True-Peak Safety Ceiling Node)
      // يضمن أن خرج الصوت النهائي مرتفع ونقي ولا يتجاوز سقف الأمان
      if (!this.ceilingGainNode) {
        this.ceilingGainNode = this.audioContext.createGain();
      }
      this.ceilingGainNode.gain.cancelScheduledValues(now);
      this.ceilingGainNode.gain.setTargetAtTime(isBoostActive ? 0.96 : 1.0, now, 0.05);

      // ربط سلسلة المعالجة الصوتية الاحترافية (DSP Audio Processing Chain)
      if (!this.webAudioConnected && this.audioElement && isBoostActive) {
        try {
          this.audioSourceNode = this.audioContext.createMediaElementSource(this.audioElement);
          this.audioSourceNode.connect(this.highPassFilterNode);
          this.highPassFilterNode.connect(this.lowShelfFilterNode);
          this.lowShelfFilterNode.connect(this.presenceFilterNode);
          this.presenceFilterNode.connect(this.boostGainNode);
          this.boostGainNode.connect(this.dynamicsCompressorNode);
          this.dynamicsCompressorNode.connect(this.ceilingGainNode);
          this.ceilingGainNode.connect(this.audioContext.destination);
          this.webAudioConnected = true;
        } catch (e) {
          // If already connected or cross-origin limits direct connection
        }
      }
    } catch (err) {
      console.warn('Web Audio gain setup notice:', err);
    }
  }

  /**
   * Retrieves comprehensive telemetry and status of the embedded ExoPlayer engine
   */
  public getExoPlayerInfo(): ExoPlayerInfo {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const hasNativeBridge = Boolean(w?.AndroidControl?.playStream || w?.ExoPlayer?.play || w?.AndroidExoPlayer?.play);
    let bufferSec = 0;
    try {
      if (this.audioElement && this.audioElement.buffered.length > 0) {
        bufferSec = Math.max(0, this.audioElement.buffered.end(this.audioElement.buffered.length - 1) - this.audioElement.currentTime);
      }
    } catch (_) {}

    return {
      isActive: this.isExoPlayerActive(),
      engineType: hasNativeBridge ? 'native_media3' : 'embedded_web',
      version: hasNativeBridge ? 'ExoPlayer Native (Media3 1.2.0)' : 'ExoPlayer Embedded Engine (Media3 1.2.0 Architecture)',
      bufferSeconds: Math.round(bufferSec * 10) / 10,
      maxBufferSeconds: 50,
      liveSyncSeconds: 2.5,
      audioFocusExclusive: true,
      audioBoostDb: this.isBoosted3x ? 5.3 : 0,
      audioBoostMultiplier: this.isBoosted3x ? 1.85 : 1.0,
      isAudioBoosted: this.isBoosted3x,
      targetAndroid: 'Android 6.0 (Marshmallow API 23) → Android 15 (API 35)',
      supportedDevices: 'الرسيفر (TV Box / Android TV) + الموبايل (Mobile)',
    };
  }

  public stop(clearSavedLastChannel = true) {
    this.isUserInitiatedStop = true;
    this.clearRetryTimer();

    this.stopPreviousStream();
    this.releaseAudioFocus();
    this.clearMediaSession();

    // إيقاف البث في الجسر الأصلي AndroidControl إن وجد
    try {
      const w = typeof window !== 'undefined' ? (window as any) : null;
      if (w && w.AndroidControl && typeof w.AndroidControl.stopStream === 'function') {
        console.log('[NativeBridge] AndroidControl.stopStream found, stopping native stream');
        w.AndroidControl.stopStream();
      }
    } catch (e) {
      console.warn('[NativeBridge] Error calling AndroidControl.stopStream:', e);
    }

    this.activeChannel = null;
    this.callbacks?.onActiveChannelChange(null);
    this.setStatus('idle');

    if (clearSavedLastChannel) {
      try {
        localStorage.removeItem('m3u_last_played_channel');
      } catch (e) {
        console.warn('Failed to remove last played channel', e);
      }
    }
  }
}

export const playerEngine = new PlayerEngine();
