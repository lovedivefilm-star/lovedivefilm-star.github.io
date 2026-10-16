/** Official YouTube IFrame API, attached to an existing iframe.
 * https://developers.google.com/youtube/iframe_api_reference#Examples
 * https://developers.google.com/youtube/player_parameters#origin
 * The iframe is never replaced to change its inline/floating presentation.
 */
export type FilmMediaElement = HTMLVideoElement | HTMLIFrameElement;
export type FilmPlaybackState = {
  ready: boolean;
  paused: boolean;
  ended: boolean;
  started: boolean;
  blocked: boolean;
  error: number | string | null;
};
export type FilmPlayback = {
  element: FilmMediaElement;
  kind: 'youtube' | 'local';
  snapshot(): Readonly<FilmPlaybackState>;
  play(): void;
  pause(): void;
  subscribe(listener: () => void): () => void;
  destroy(): void;
};
type YouTubePlayer = { playVideo(): void; pauseVideo(): void; destroy(): void };
type YouTubeEvent = { target: YouTubePlayer; data?: number };
type YouTubeAPI = {
  Player: new (frame: HTMLIFrameElement, options: { events: {
    onReady(event: YouTubeEvent): void;
    onStateChange(event: YouTubeEvent): void;
    onError(event: YouTubeEvent): void;
    onAutoplayBlocked(event: YouTubeEvent): void;
  } }) => YouTubePlayer;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const controllers = new WeakMap<FilmMediaElement, FilmPlayback>();
const active = new Set<FilmPlayback>();
let apiPromise: Promise<YouTubeAPI> | undefined;
let nextFrame = 0;

function loadYouTubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  const pending = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    let settled = false;
    const complete = () => {
      if (settled || !window.YT?.Player) return;
      settled = true; window.clearTimeout(timeout); resolve(window.YT);
    };
    window.onYouTubeIframeAPIReady = () => {
      try { previous?.(); } finally { complete(); }
    };
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true; reject(new Error('youtube-api-timeout'));
    }, 15000);
    let script = document.querySelector<HTMLScriptElement>('script[data-portfolio-youtube-api],script[src="https://www.youtube.com/iframe_api"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true; script.dataset.portfolioYoutubeApi = 'true';
      document.head.append(script);
    }
    script.addEventListener('error', () => {
      if (settled) return;
      settled = true; window.clearTimeout(timeout); script?.remove(); reject(new Error('youtube-api-network'));
    }, { once: true });
    complete();
  });
  apiPromise = pending;
  void pending.catch(() => { if (apiPromise === pending) apiPromise = undefined; });
  return pending;
}

export function createYouTubeFrame({ id, title, start = 0 }: { id: string; title: string; start?: number }): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.id = `portfolio-youtube-${++nextFrame}`;
  const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  url.search = new URLSearchParams({
    enablejsapi: '1', origin: location.origin, autoplay: '1', playsinline: '1', controls: '1',
    rel: '0', start: String(Math.max(0, Math.floor(start)))
  }).toString();
  frame.src = url.href;
  frame.title = title;
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.dataset.youtubePlayer = 'true';
  return frame;
}

/** One shared controller per DOM element, used by inline, mini and reset paths. */
export function connectFilmMedia(element: FilmMediaElement, ownerRoot?: HTMLElement): FilmPlayback {
  const existing = controllers.get(element);
  if (existing) return existing;
  const native = element instanceof HTMLVideoElement;
  const state: FilmPlaybackState = {
    ready: native && element.readyState > 0,
    paused: native ? element.paused : true,
    ended: native && element.ended,
    started: native && !element.paused,
    blocked: false, error: null
  };
  const listeners = new Set<() => void>();
  const abort = new AbortController();
  let destroyed = false;
  let player: YouTubePlayer | undefined;
  let wantsPlayback = false;
  let youtubeState = 'loading';
  const owner = ownerRoot ?? element.closest<HTMLElement>('[data-film-root]');
  function emit() {
    if (destroyed) return;
    if (!native) {
      const visibleState = state.error !== null ? 'error' : state.blocked ? 'blocked' : youtubeState;
      element.dataset.youtubeState = visibleState;
      if (owner) {
        owner.dataset.youtubeState = visibleState;
        const fallback = owner.querySelector<HTMLElement>('[data-film-error]');
        if (fallback) fallback.hidden = state.error === null && !state.blocked;
        if (state.error !== null) owner.dataset.youtubeError = String(state.error);
        else delete owner.dataset.youtubeError;
      }
    }
    for (const listener of listeners) listener();
  }
  function beganPlaying() {
    document.dispatchEvent(new CustomEvent('portfolio:film-media-play', { detail: { element } }));
  }
  const controller: FilmPlayback = {
    element, kind: native ? 'local' : 'youtube',
    snapshot: () => ({ ...state }),
    play() {
      if (destroyed) return;
      wantsPlayback = true; state.blocked = false;
      if (native) {
        void element.play().catch(error => {
          if (destroyed) return;
          state.paused = true; state.blocked = true; state.error = error instanceof Error ? error.name : 'playback-blocked'; emit();
        });
      } else if (player && state.ready) player.playVideo();
    },
    pause() {
      if (destroyed) return;
      wantsPlayback = false;
      if (native) element.pause();
      else if (player && state.ready) player.pauseVideo();
      // An outstanding API load must not start a film after another clip took over.
      state.paused = true; emit();
    },
    subscribe(listener) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    destroy() {
      if (destroyed) return;
      destroyed = true; wantsPlayback = false; abort.abort(); listeners.clear(); active.delete(controller); controllers.delete(element);
      if (native) element.pause();
      else player?.destroy();
      if (owner) {
        delete owner.dataset.youtubeState; delete owner.dataset.youtubeError;
        const fallback = owner.querySelector<HTMLElement>('[data-film-error]');
        if (fallback) fallback.hidden = true;
      }
    }
  };
  controllers.set(element, controller); active.add(controller);
  if (native) {
    const update = () => {
      state.ready = element.readyState > 0; state.paused = element.paused; state.ended = element.ended;
      if (!element.paused) { state.started = true; state.blocked = false; state.error = null; }
      if (element.error) state.error = element.error.code;
      emit();
    };
    for (const event of ['loadedmetadata', 'play', 'pause', 'ended', 'error', 'enterpictureinpicture', 'leavepictureinpicture']) {
      element.addEventListener(event, update, { signal: abort.signal });
    }
    element.addEventListener('play', beganPlaying, { signal: abort.signal });
  } else {
    emit();
    void loadYouTubeAPI().then(api => {
      if (destroyed || !element.isConnected) return;
      player = new api.Player(element, { events: {
        onReady(event) {
          if (destroyed) return;
          player = event.target; state.ready = true; if (youtubeState === 'loading') youtubeState = 'unstarted'; emit();
          if (wantsPlayback) player.playVideo(); else player.pauseVideo();
        },
        onStateChange(event) {
          if (destroyed) return;
          const names: Record<number, string> = { [-1]: 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' };
          youtubeState = names[event.data ?? -1] ?? 'unstarted';
          state.ended = event.data === 0;
          if (event.data === 1) { state.started = true; state.paused = false; state.blocked = false; state.error = null; wantsPlayback = true; }
          else if (event.data !== 3) state.paused = true;
          emit();
          if (event.data === 1) beganPlaying();
        },
        onError(event) {
          if (destroyed) return;
          state.error = event.data ?? 'youtube-player'; state.paused = true; wantsPlayback = false; youtubeState = 'error'; emit();
        },
        onAutoplayBlocked() {
          if (destroyed) return;
          state.blocked = true; state.paused = true; wantsPlayback = false; youtubeState = 'blocked'; emit();
        }
      } });
    }).catch(error => {
      if (destroyed) return;
      state.error = error instanceof Error ? error.message : 'youtube-api'; state.paused = true; youtubeState = 'error'; emit();
    });
  }
  return controller;
}

export function pauseFilmMedia(except?: FilmMediaElement) {
  for (const controller of active) if (controller.element !== except) controller.pause();
}
export function destroyFilmMedia(element: FilmMediaElement) { controllers.get(element)?.destroy(); }
