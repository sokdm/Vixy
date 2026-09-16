import { VIDU_REALTIME_MODEL } from './realtime-provider';
import type { RtcEngine } from 'aliyun-rtc-sdk';

export type ViduConnectionState = 'connecting' | 'connected' | 'generating' | 'disconnected' | 'reconnecting';
export interface ViduTransformInput {
  prompt?: string;
  enhance?: boolean;
  image?: Blob | string | null;
  editingType?: 'style_transfer' | 'subject_replacement' | 'background_replacement' | 'virtual_tryon';
}
export interface ViduClientOptions {
  apiKey?: string;
  baseUrl?: string;
  liveId?: string;
  renderUid?: string;
  rtc?: Record<string, unknown> | null;
  maxSeconds?: number;
  signal?: AbortSignal;
  modelName?: string;
  mirror?: 'auto' | boolean;
  resolution?: '720p' | '1080p' | '540p';
  onConnectionChange?: (state: ViduConnectionState) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onError?: (error: unknown) => void;
}
export interface ViduRealtimeSession {
  sessionId: string;
  getConnectionState: () => ViduConnectionState;
  set: (input: ViduTransformInput) => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: 'error', handler: (error: unknown) => void) => void;
  off: (event: 'error', handler: (error: unknown) => void) => void;
}

export async function encodeViduReference(image: Blob | string): Promise<string> {
  if (typeof image === 'string') return image;
  if (image.size > 2_000_000) throw new Error('Choose a reference image under 2 MB for Pro.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the Pro reference image.'));
    reader.readAsDataURL(image);
  });
}

export function buildViduSocketUrl(baseUrl: string, liveId: string, connId: string, secret: string): string {
  const url = new URL('/live/ws/live/connect', baseUrl);
  if (url.protocol !== 'https:' || !['api.vidu.com', 'api.vidu.cn'].includes(url.hostname)) {
    throw new Error('Unsupported Pro server address.');
  }
  url.protocol = 'wss:';
  url.search = new URLSearchParams({ live_id: liveId, conn_id: connId, client_secret: secret }).toString();
  return url.toString();
}

export class ViduRealtimeClient {
  private apiKey: string;
  private baseUrl: string;
  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.vidu.com';
  }

  async connect(inputStream: MediaStream, options: ViduClientOptions = {}): Promise<ViduRealtimeSession> {
    const liveId = options.liveId;
    const renderUid = options.renderUid;
    const rtc = options.rtc;
    if (!liveId || !renderUid || typeof rtc?.token !== 'string' || typeof rtc.user_id !== 'string'
      || !this.apiKey || this.apiKey.startsWith('mock_') || this.apiKey.startsWith('vda_')) {
      throw new Error('Pro requires real Vidu session credentials. Restart the session.');
    }
    const inputTrack = inputStream.getVideoTracks()[0];
    if (!inputTrack || inputTrack.readyState !== 'live') throw new Error('Pro requires an active camera.');
    const { default: AliRtcEngine } = await import('aliyun-rtc-sdk');
    const support = await AliRtcEngine.isSupported();
    if (options.signal?.aborted) throw new Error('Pro session was cancelled.');
    if (!support.support) throw new Error('This browser cannot run Pro video. Use an updated Chrome or Edge.');
    AliRtcEngine.setLogLevel(0);
    let engine: RtcEngine | null = AliRtcEngine.getInstance();
    const cameraTrack = inputTrack.clone();
    const connId = crypto.randomUUID();
    let socket: WebSocket | null = null;
    let sequence = 1;
    let state: ViduConnectionState = 'connecting';
    let stopped = false;
    let ready = false;
    let cleanupPromise: Promise<void> | null = null;
    let initRetry: ReturnType<typeof setTimeout> | undefined;
    let sessionTimer: ReturnType<typeof setTimeout> | undefined;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    const listeners = new Set<(error: unknown) => void>();
    let rejectStartup: (error: Error) => void = () => {};
    let resolveInit: () => void = () => {};
    let resolveVideo: () => void = () => {};
    const initPromise = new Promise<void>(resolve => { resolveInit = resolve; });
    const videoPromise = new Promise<void>(resolve => { resolveVideo = resolve; });
    const failurePromise = new Promise<never>((_, reject) => { rejectStartup = reject; });
    void failurePromise.catch(() => {});
    const changeState = (next: ViduConnectionState) => {
      state = next;
      options.onConnectionChange?.(next);
    };
    const send = (type: number, payload: Record<string, unknown>) => {
      if (socket?.readyState !== WebSocket.OPEN) throw new Error('Pro signaling connection is closed.');
      socket.send(JSON.stringify({ type, live_id: liveId, conn_id: connId, seq_id: sequence++, payload }));
    };
    const cleanup = (): Promise<void> => {
      if (cleanupPromise) return cleanupPromise;
      stopped = true;
      clearTimeout(initRetry);
      clearTimeout(sessionTimer);
      clearTimeout(startupTimer);
      window.removeEventListener('pagehide', onPageHide);
      options.signal?.removeEventListener('abort', onAbort);
      // Hang up before any database requests or RTC teardown; this stops provider billing.
      if (socket?.readyState === WebSocket.OPEN) {
        try { send(5, { hangup: { hangup_reason: 'user_hangup' } }); } catch { /* Already closed. */ }
      }
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }
      cameraTrack.stop();
      const currentEngine = engine;
      engine = null;
      currentEngine?.removeAllListeners();
      cleanupPromise = Promise.resolve().then(() => currentEngine?.destroy()).catch(() => {});
      return cleanupPromise;
    };
    const fail = (message: string) => {
      if (stopped) return;
      const error = new Error(message);
      rejectStartup(error);
      void cleanup();
      options.onError?.(error);
      for (const listener of listeners) listener(error);
      changeState('disconnected');
    };
    function onAbort() { fail('Pro session was cancelled.'); }
    function onPageHide() { fail('Pro session ended when leaving the page.'); }
    const assertActive = () => { if (stopped) throw new Error('Pro session was cancelled.'); };

    try {
      changeState('connecting');
      window.addEventListener('pagehide', onPageHide);
      options.signal?.addEventListener('abort', onAbort, { once: true });
      startupTimer = setTimeout(() => fail('Pro connection timed out before receiving generated video.'), 35000);
      engine.on('videoSubscribeStateChanged', (userId: string, _old: number, next: number) => {
        if (String(userId) !== renderUid || next !== 3 || stopped) return;
        void engine?.getVideoTrack({ userId, streamType: 0 }).then(track => {
          if (!track || stopped) return;
          options.onRemoteStream?.(new MediaStream([track]));
          resolveVideo();
          if (ready) changeState('generating');
        }).catch(() => fail('Pro could not receive its generated video track.'));
      });
      engine.on('remoteUserOffLineNotify', (uid: string) => {
        if (String(uid) === renderUid) fail('Pro rendering ended. Start a new session.');
      });
      engine.on('bye', () => fail('Pro RTC session ended. Start a new session.'));
      engine.on('authInfoExpired', () => fail('Pro session expired. Start a new session.'));
      // Supply our already selected camera track; do not open another camera or microphone.
      await Promise.race([engine.publishLocalAudioStream(false), failurePromise]);
      assertActive();
      engine.setDefaultSubscribeAllRemoteAudioStreams(false);
      engine.setDefaultSubscribeAllRemoteVideoStreams(true);
      await Promise.race([engine.switchCamera(undefined, cameraTrack), failurePromise]);
      assertActive();
      const preparedTrack = await Promise.race([engine.getVideoTrack({ streamType: 0 }), failurePromise]);
      assertActive();
      if (!preparedTrack) throw new Error('Pro could not prepare the selected camera track.');
      socket = new WebSocket(buildViduSocketUrl(options.baseUrl || this.baseUrl, liveId, connId, this.apiKey));
      socket.onopen = () => { if (!stopped) send(1, { conn_init: { version: 1 } }); };
      socket.onerror = () => fail('Pro signaling could not connect. Check the Vidu region and session credentials.');
      socket.onclose = () => fail('Pro signaling disconnected. Start a new session.');
      socket.onmessage = event => {
        if (stopped) return;
        let message;
        try { message = JSON.parse(String(event.data)); } catch { return; }
        if (message.type === 2) {
          const ack = message.payload?.conn_init_ack;
          if (ack?.success) {
            clearTimeout(initRetry);
            if (!ready) {
              ready = true;
              changeState('connected');
              sessionTimer = setTimeout(() => fail('Pro quality-test session finished. Start again to continue.'),
                Math.max(1, Math.min(options.maxSeconds || 120, 120)) * 1000);
              resolveInit();
            }
          } else if (ack?.error_code === 'NOT_READY') {
            clearTimeout(initRetry);
            initRetry = setTimeout(() => {
              if (!stopped) { try { send(1, { conn_init: { version: 1 } }); } catch { fail('Pro signaling disconnected.'); } }
            }, 2000);
          } else fail(`Pro initialization failed (${ack?.error_code || 'unknown'}).`);
        } else if (message.type === 6) {
          fail('Vidu ended this session. Start again to continue.');
        } else if (message.type === 14 && message.payload?.switch_prompt_ack?.success === false) {
          fail(`Pro could not change the image (${message.payload.switch_prompt_ack.error_code || 'unknown'}).`);
        }
      };
      await Promise.race([initPromise, failurePromise]);
      assertActive();
      await Promise.race([engine.joinChannel(rtc.token, rtc.user_id), failurePromise]);
      assertActive();
      await Promise.race([engine.publishLocalVideoStream(true), failurePromise]);
      await Promise.race([videoPromise, failurePromise]);
      assertActive();
      clearTimeout(startupTimer);
      changeState('generating');
      return {
        sessionId: liveId,
        getConnectionState: () => state,
        set: async input => {
          assertActive();
          const image = input.image ? await encodeViduReference(input.image) : null;
          assertActive();
          if (!image && !input.editingType) return;
          send(13, { switch_prompt: {
            ...(image ? { prompts: [{ type: 'image', content: image }] } : {}),
            ...(input.editingType ? { editing_type: input.editingType } : {}),
          } });
        },
        disconnect: async () => { await cleanup(); state = 'disconnected'; },
        on: (_event, handler) => { listeners.add(handler); },
        off: (_event, handler) => { listeners.delete(handler); },
      };
    } catch (error) {
      await cleanup();
      throw error;
    }
  }
}
export function createViduClient(options: { apiKey: string; baseUrl?: string }) { return new ViduRealtimeClient(options); }
export const models = { realtime: (modelName: string = VIDU_REALTIME_MODEL) => modelName };
