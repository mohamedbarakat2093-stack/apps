export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  origin?: 'user_upload' | 'preset' | 'custom';
  sourceFileName?: string;
  engine?: 'exoplayer' | 'standard';
}

export type ActiveView = 'audio_channels' | 'preset';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'reconnecting' | 'error';

export interface RetryState {
  attempt: number;
  maxAttempts: number;
  delaySeconds: number;
  active: boolean;
}

export interface StreamStats {
  format: string;
  protocol: string;
  bufferSeconds: number;
  engine: string;
  isExoPlayer: boolean;
}

export interface ExoPlayerInfo {
  isActive: boolean;
  engineType: 'native_media3' | 'embedded_web' | 'standard';
  version: string;
  bufferSeconds: number;
  maxBufferSeconds: number;
  liveSyncSeconds: number;
  audioFocusExclusive: boolean;
  audioBoostDb: number;
  audioBoostMultiplier: number;
  isAudioBoosted: boolean;
  targetAndroid: string;
  supportedDevices: string;
}

export interface StoredPlaylist {
  fileName: string;
  rawContent: string;
  channels: Channel[];
  savedAt: number;
}
