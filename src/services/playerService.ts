import Hls from 'hls.js';
import { Channel, PlayerStatus, RetryState } from '../types';

export type PlayerEventCallback = {
  onStatusChange: (status: PlayerStatus) => void;
  onActiveChannelChange: (channel: Channel | null) => void;
  onRetryUpdate: (retry: RetryState) => void;
  onErrorToast: (message: string) => void;
  onStatsUpdate?: (stats: StreamStats) => void;
};

export interface StreamStats {
  format: 'HLS (m3u8)' | 'Direct Audio' | 'MP3 / AAC';
  protocol: 'HTTP' | 'HTTPS';
  bufferSeconds: number;
  engine: string;
}

const RETRY_DELAYS = [2000, 4000, 6000];

class PlayerEngine {
  private audioElement: HTMLAudioElement | null = null;
  private hls: Hls | null = null;
  private audioContext: AudioContext | null = null;
  private silentGainNode: GainNode | null = null;
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

  constructor() {
    this.getOrCreateAudioElement();
    this.setupBackgroundKeepAlive();
  }

  /**
   * Standard HTML5 Audio Element with preload="none" and No-CORS Mode.
   * Directly delegates stream buffering and parsing to the operating system layer.
   */
  private getOrCreateAudioElement(): HTMLAudioElement {
    if (!this.audioElement) {
      const audio = new Audio();
      audio.id = 'audiocast-audio-core';
      audio.preload = 'none';
      audio.autoplay = false;
      audio.removeAttribute('crossOrigin');

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

            this.callbacks?.onStatsUpdate?.({
              format: isHls ? 'HLS (m3u8)' : 'Direct Audio',
              protocol: url.startsWith('http://') ? 'HTTP' : 'HTTPS',
              bufferSeconds: Math.round(bufferSeconds * 10) / 10,
              engine: isHls ? 'Hls.js Live Engine' : 'HTML5 Standard Audio (OS Stream)',
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
        // إظهار رسالة الخطأ فوراً كما كانت في الأول دون أي تأخير
        this.handleChannelUnavailable('القناة غير متاحة');
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
   */
  public enforceExclusiveAudioFocus() {
    if (typeof document === 'undefined') return;

    try {
      const allMedia = document.querySelectorAll('audio, video');
      allMedia.forEach((media) => {
        if (media !== this.audioElement) {
          const mediaEl = media as HTMLMediaElement;
          try {
            mediaEl.muted = true;
            mediaEl.pause();
          } catch (_) {}
        }
      });

      if (this.audioElement) {
        this.audioElement.muted = false;
        this.audioElement.volume = 1.0;
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
          await this.audioContext.resume();
        }

        // Silent keep-alive to keep the OS audio pipeline active
        if (!this.silentGainNode) {
          try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            gain.gain.value = 0.00001; // virtually inaudible keep-alive
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start();
            this.silentGainNode = gain;
          } catch (_) {}
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

    // مهلة أمان سريعة للتحميل: إذا لم يستجب السيرفر فوراً تظهر رسالة القناة غير متاحة بدون تأخير طويل
    if (this.loadTimeoutId) clearTimeout(this.loadTimeoutId);
    this.loadTimeoutId = setTimeout(() => {
      if (this.status === 'loading' && !this.playbackStarted) {
        this.handleChannelUnavailable('القناة غير متاحة');
      }
    }, 2000);

    // 2. طلب السيطرة الكاملة والحصرية على الصوت
    await this.requestAudioFocus();

    // 3. تهيئة MediaSession والحفاظ على الجلسة الحصرية
    this.setupMediaSession(channel);

    // 4. حفظ القناة كآخر قناة تم تشغيلها
    try {
      localStorage.setItem('m3u_last_played_channel', JSON.stringify(channel));
    } catch (e) {
      console.warn('Failed to persist last played channel', e);
    }

    // 5. بدء محاولة التشغيل فوراً
    await this.startPlayback(channel.url);
    return true;
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
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 10,
        });

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
            } else {
              // إظهار رسالة الخطأ فوراً
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
   * Direct HTML5 Audio Element playback:
   * - Assigns audio.src = url directly
   * - No crossOrigin, no fetch checks, no custom headers
   * - Calls audio.load() then audio.play() directly
   * - preload="none" delegates streaming directly to the OS layer
   * - Error triggers "القناة غير متاحة" immediately
   */
  private playDirectAudio(url: string): Promise<boolean> {
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
        audio.preload = 'none';
        audio.removeAttribute('crossOrigin');
        audio.src = url;
        audio.load();

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              finish(true);
            })
            .catch((err) => {
              console.warn('Direct audio play error:', err);
              if (this.status === 'loading') {
                this.handleChannelUnavailable('القناة غير متاحة');
              }
              finish(false);
            });
        } else {
          finish(true);
        }
      } catch (err) {
        console.warn('Direct audio exception:', err);
        if (this.status === 'loading') {
          this.handleChannelUnavailable('القناة غير متاحة');
        }
        finish(false);
      }
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

  public stop(clearSavedLastChannel = true) {
    this.isUserInitiatedStop = true;
    this.clearRetryTimer();

    this.stopPreviousStream();
    this.releaseAudioFocus();
    this.clearMediaSession();

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
