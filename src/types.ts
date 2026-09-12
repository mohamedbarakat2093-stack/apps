export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'reconnecting' | 'error';

export interface RetryState {
  attempt: number;
  maxAttempts: number;
  delaySeconds: number;
  active: boolean;
}

export interface StoredPlaylist {
  fileName: string;
  rawContent: string;
  channels: Channel[];
  savedAt: number;
}
