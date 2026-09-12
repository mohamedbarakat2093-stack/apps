import Hls from 'hls.js';
import { Channel, PlayerStatus, RetryState } from '../types';

export type PlayerEventCallback = {
  onStatusChange: (status: PlayerStatus) => void;
  onActiveChannelChange: (channel: Channel | null) => void;
  onRetryUpdate: (retry: RetryState) => void;
  onErrorToast: (message: string) => void;
};

const RETRY_DELAYS = [2000, 4000, 6000]; // 2s, 4s, 6s as specified in step 4

class PlayerEngine {
  private audioElement: HTMLAudioElement | null = null;
  private hls: Hls | null = null;
  private audioContext: AudioContext | null = null;
  private activeChannel: Channel | null = null;
  private status: PlayerStatus = 'idle';
  private callbacks: PlayerEventCallback | null = null;

  private retryCount = 0;
  private retryTimeoutId: any = null;
  private isUserInitiatedStop = false;
  private isReconnecting = false;
  private playTimeoutId: any = null;

  constructor() {
    this.initAudioElement();
  }

  private initAudioElement() {
    if (typeof window === 'undefined') return;

    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.autoplay = false;

    this.audioElement.addEventListener('playing', () => {
      this.clearPlayTimeout();
      this.isReconnecting = false;
      this.retryCount = 0;
      this.notifyRetryState({ attempt: 0, maxAttempts: 3, delaySeconds: 0, active: false });
      this.setStatus('playing');
      this.updateMediaSessionPlaybackState('playing');
    });

    this.audioElement.addEventListener('pause', () => {
      if (this.status === 'playing') {
        this.setStatus('paused');
        this.updateMediaSessionPlaybackState('paused');
      }
    });

    this.audioElement.addEventListener('waiting', () => {
      if (this.status === 'playing') {
        // network buffering or momentary stall
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio element error:', e);
      this.handlePlaybackFailure();
    });

    this.audioElement.addEventListener('stalled', () => {
      if (this.status === 'playing') {
        console.warn('Playback stalled, checking connection...');
        // If stalled for too long, might be disconnected
      }
    });
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
   * Request Audio Focus using Web Audio Context
   */
  private async requestAudioFocus(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return true;
    } catch (err) {
      console.warn('Audio focus request error:', err);
      return true; // Still allow audio playback attempt
    }
  }

  /**
   * Release Audio Focus
   */
  private releaseAudioFocus() {
    try {
      if (this.audioContext && this.audioContext.state === 'running') {
        this.audioContext.suspend();
      }
    } catch (err) {
      console.warn('Audio focus release error:', err);
    }
  }

  /**
   * Setup System MediaSession
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
          artist: channel.group || 'بث مباشر',
          album: 'AudioCast',
          artwork,
        });

        navigator.mediaSession.setActionHandler('play', () => {
          this.resume();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          this.pause();
        });

        navigator.mediaSession.setActionHandler('stop', () => {
          this.stop(true);
        });
      } catch (e) {
        console.warn('MediaSession setup caught non-fatal exception:', e);
      }
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch (_) {
        // Safe ignore for older Android WebView versions
      }
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
      } catch (_) {
        // Safe ignore for older Android WebView versions
      }
    }
  }

  private clearPlayTimeout() {
    if (this.playTimeoutId) {
      clearTimeout(this.playTimeoutId);
      this.playTimeoutId = null;
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
   * 3. عند الضغط على قناة من القائمة
   */
  public async playChannel(channel: Channel, isAutoResume = false): Promise<boolean> {
    this.clearRetryTimer();
    this.clearPlayTimeout();
    this.isUserInitiatedStop = false;

    // لو فيه قناة شغالة حالياً -> يوقفها الأول
    if (this.activeChannel) {
      this.stopInternal(false);
    }

    this.activeChannel = channel;
    this.callbacks?.onActiveChannelChange(channel);
    this.setStatus('loading');

    // يطلب Audio Focus
    await this.requestAudioFocus();

    // يجهّز الـ MediaSession
    this.setupMediaSession(channel);

    // Save as last played channel in localStorage
    try {
      localStorage.setItem('m3u_last_played_channel', JSON.stringify(channel));
    } catch (e) {
      console.warn('Failed to persist last played channel', e);
    }

    // Start playback
    const success = await this.loadStreamSource(channel.url);
    if (!success) {
      // لو الرابط معطوب أو مش بيرد:
      // رسالة واضحة: "القناة دي مش متاحة دلوقتي"
      // يفضل مكانه في القائمة بدون ما يتحدد كـ "شغال"
      this.handleInitialLoadError();
      return false;
    }

    return true;
  }

  private async loadStreamSource(url: string): Promise<boolean> {
    if (!this.audioElement) return false;

    // Reset current audio
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    const isHls = url.includes('.m3u8') || url.includes('/hls/');

    return new Promise((resolve) => {
      let resolved = false;

      const markFailed = () => {
        if (!resolved) {
          resolved = true;
          this.clearPlayTimeout();
          resolve(false);
        }
      };

      const markSuccess = () => {
        if (!resolved) {
          resolved = true;
          this.clearPlayTimeout();
          resolve(true);
        }
      };

      // Timeout if stream doesn't respond within 9 seconds
      this.playTimeoutId = setTimeout(() => {
        if (this.status === 'loading') {
          console.warn('Stream initial load timed out');
          markFailed();
        }
      }, 9000);

      const canPlayHlsNatively =
        this.audioElement.canPlayType('application/vnd.apple.mpegurl') ||
        this.audioElement.canPlayType('application/x-mpegURL');

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        this.hls = hls;

        hls.loadSource(url);
        hls.attachMedia(this.audioElement!);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.audioElement?.play()
            .then(() => markSuccess())
            .catch(() => {
              markFailed();
            });
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn('HLS fatal error:', data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (this.status === 'playing') {
                  this.handlePlaybackFailure();
                } else {
                  markFailed();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                this.hls = null;
                if (this.status === 'playing') {
                  this.handlePlaybackFailure();
                } else {
                  markFailed();
                }
                break;
            }
          }
        });
      } else {
        // Direct audio/video stream or Native Android HLS playback via HTML5 Audio
        this.audioElement.src = url;
        this.audioElement.load();
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => markSuccess())
            .catch((err) => {
              console.warn('Native audio play error:', err);
              markFailed();
            });
        } else {
          markSuccess();
        }
      }
    });
  }

  private handleInitialLoadError() {
    this.setStatus('idle');
    const failedChannel = this.activeChannel;
    this.activeChannel = null;
    this.callbacks?.onActiveChannelChange(null);
    this.clearMediaSession();
    this.releaseAudioFocus();

    // رسالة واضحة: "القناة دي مش متاحة دلوقتي"
    this.callbacks?.onErrorToast(
      failedChannel ? `القناة دي مش متاحة دلوقتي (${failedChannel.name})` : 'القناة دي مش متاحة دلوقتي'
    );
  }

  /**
   * 4. أثناء التشغيل - مراقبة الاتصال وإعادة المحاولة
   * محاولة 1: بعد ثانيتين
   * محاولة 2: بعد أربع ثواني
   * محاولة 3: بعد ست ثواني
   * لو الثلاث فشلوا -> يوقف، يشيل علامة ▶، رسالة "انقطع الاتصال بالقناة"
   */
  private handlePlaybackFailure() {
    if (this.isUserInitiatedStop || !this.activeChannel) return;

    // Start / Continue Retry Sequence
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
        const ok = await this.loadStreamSource(this.activeChannel.url);
        if (ok) {
          // لو أي محاولة نجحت -> يكمّل عادي من غير ما يزعج المستخدم برسائل
          this.isReconnecting = false;
          this.retryCount = 0;
          this.notifyRetryState({ attempt: 0, maxAttempts: 3, delaySeconds: 0, active: false });
          this.setStatus('playing');
        } else {
          // If still failing, recurse to next retry
          this.handlePlaybackFailure();
        }
      }, delay);
    } else {
      // لو الثلاث محاولات فشلوا:
      // يوقف، يشيل علامة ▶، رسالة "انقطع الاتصال بالقناة"
      this.clearRetryTimer();
      this.activeChannel = null;
      this.callbacks?.onActiveChannelChange(null);
      this.stopInternal(true);
      this.setStatus('idle');
      this.callbacks?.onErrorToast('انقطع الاتصال بالقناة');
    }
  }

  /**
   * 5. عند الضغط على Play/Pause
   * - لو شغال → pause (الصوت يوقف، الاتصال يفضل مفتوح)
   * - لو متوقف بـ pause → يكمّل من نفس المكان
   */
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
    if (this.audioElement) {
      this.audioElement.pause();
      this.setStatus('paused');
      this.updateMediaSessionPlaybackState('paused');
    }
  }

  public resume() {
    if (this.audioElement && this.activeChannel) {
      this.requestAudioFocus().then(() => {
        this.audioElement?.play()
          .then(() => {
            this.setStatus('playing');
            this.updateMediaSessionPlaybackState('playing');
          })
          .catch(() => {
            this.handlePlaybackFailure();
          });
      });
    }
  }

  /**
   * 8. عند إيقاف القناة أو إغلاق التطبيق نهائياً
   * - يوقف التشغيل (stop)
   * - يسيب Audio Focus
   * - يقفل الإشعار
   * - يقفل الـ Service
   * - "آخر قناة شغالة" تتمسح
   */
  public stop(clearSavedLastChannel = true) {
    this.isUserInitiatedStop = true;
    this.clearRetryTimer();
    this.clearPlayTimeout();

    this.stopInternal(true);

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

  private stopInternal(fullCleanup: boolean) {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (fullCleanup) {
      this.releaseAudioFocus();
      this.clearMediaSession();
    }
  }
}

export const playerEngine = new PlayerEngine();
