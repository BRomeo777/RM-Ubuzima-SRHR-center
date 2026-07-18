import { useEffect, useRef, useId } from 'react';
import { useVideo } from '../contexts/VideoContext';

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  playsInline?: boolean;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

export function VideoPlayer({
  src,
  className = '',
  autoPlay = false,
  controls = true,
  playsInline = true,
  poster,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { registerVideo, unregisterVideo, currentlyPlayingId, playVideo } = useVideo();
  const videoId = useId();

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      registerVideo(videoId, video);

      const handlePlay = () => {
        // When this video starts playing, pause all others
        playVideo(videoId);
        onPlay?.();
      };

      const handlePause = () => {
        onPause?.();
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        unregisterVideo(videoId);
      };
    }
  }, [videoId, registerVideo, unregisterVideo, playVideo, onPlay, onPause]);

  // If another video starts playing, this one should pause
  useEffect(() => {
    const video = videoRef.current;
    if (video && currentlyPlayingId && currentlyPlayingId !== videoId) {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [currentlyPlayingId, videoId]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      autoPlay={autoPlay}
      controls={controls}
      playsInline={playsInline}
      poster={poster}
    />
  );
}

interface YouTubePlayerProps {
  src: string;
  className?: string;
  videoId?: string;
}

// Global state for YouTube player management
let youtubeAPIReady = false;
const youtubePlayerCallbacks: (() => void)[] = [];

// Load YouTube IFrame API
function loadYouTubeAPI() {
  if (youtubeAPIReady || (window as any).YT?.Player) {
    youtubeAPIReady = true;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    // Add callback to queue
    youtubePlayerCallbacks.push(resolve);

    // Check if API script is already loading
    if ((window as any).onYouTubeIframeAPIReady) {
      return;
    }

    // Create script tag
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Setup global callback
    (window as any).onYouTubeIframeAPIReady = () => {
      youtubeAPIReady = true;
      youtubePlayerCallbacks.forEach(cb => cb());
      youtubePlayerCallbacks.length = 0;
    };
  });
}

// Extract YouTube video ID from URL
function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Store player instances globally for control
const youtubePlayers = new Map<string, any>();

export function YouTubePlayer({ src, className = '', videoId: customVideoId }: YouTubePlayerProps) {
  const { currentlyPlayingId, playVideo, pauseAllVideos, registerVideo, unregisterVideo } = useVideo();
  const containerId = useId();
  const videoId = customVideoId || containerId;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    // Register this as a video with the context
    // We create a mock video element that responds to pause
    const mockVideo = {
      pause: () => {
        if (playerRef.current && playerRef.current.pauseVideo) {
          playerRef.current.pauseVideo();
        }
      },
      paused: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLVideoElement;

    registerVideo(videoId, mockVideo);

    // Initialize YouTube player
    const initPlayer = async () => {
      await loadYouTubeAPI();
      if (!isMounted || !containerRef.current) return;

      const ytVideoId = getYouTubeId(src);
      if (!ytVideoId) return;

      // Create player
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId: ytVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              // This video started playing - pause all others
              playVideo(videoId);
              // Pause other YouTube players
              youtubePlayers.forEach((player, id) => {
                if (id !== videoId && player.pauseVideo) {
                  player.pauseVideo();
                }
              });
            }
          },
        },
      });

      youtubePlayers.set(videoId, playerRef.current);
    };

    initPlayer();

    return () => {
      isMounted = false;
      unregisterVideo(videoId);
      youtubePlayers.delete(videoId);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [src, videoId, registerVideo, unregisterVideo, playVideo]);

  // Handle external pause requests
  useEffect(() => {
    if (currentlyPlayingId !== videoId && playerRef.current && playerRef.current.pauseVideo) {
      playerRef.current.pauseVideo();
    }
  }, [currentlyPlayingId, videoId]);

  return (
    <div ref={containerRef} className={`${className}`} style={{ width: '100%', height: '100%' }} />
  );
}
