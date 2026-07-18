import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

interface VideoContextType {
  currentlyPlayingId: string | null;
  registerVideo: (id: string, videoElement: HTMLVideoElement | null) => void;
  unregisterVideo: (id: string) => void;
  playVideo: (id: string) => void;
  pauseVideo: (id: string) => void;
  pauseAllVideos: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const registerVideo = useCallback((id: string, videoElement: HTMLVideoElement | null) => {
    if (videoElement) {
      videoRefs.current.set(id, videoElement);
    } else {
      videoRefs.current.delete(id);
    }
  }, []);

  const unregisterVideo = useCallback((id: string) => {
    videoRefs.current.delete(id);
    if (currentlyPlayingId === id) {
      setCurrentlyPlayingId(null);
    }
  }, [currentlyPlayingId]);

  const pauseAllVideos = useCallback(() => {
    videoRefs.current.forEach((video, id) => {
      if (!video.paused) {
        video.pause();
      }
    });
  }, []);

  const playVideo = useCallback((id: string) => {
    // Pause all other videos first
    videoRefs.current.forEach((video, videoId) => {
      if (videoId !== id && !video.paused) {
        video.pause();
      }
    });
    
    // Play the requested video
    const video = videoRefs.current.get(id);
    if (video) {
      video.play().catch(() => {
        // Autoplay might be blocked, that's ok
      });
    }
    setCurrentlyPlayingId(id);
  }, []);

  const pauseVideo = useCallback((id: string) => {
    const video = videoRefs.current.get(id);
    if (video) {
      video.pause();
    }
    if (currentlyPlayingId === id) {
      setCurrentlyPlayingId(null);
    }
  }, [currentlyPlayingId]);

  return (
    <VideoContext.Provider
      value={{
        currentlyPlayingId,
        registerVideo,
        unregisterVideo,
        playVideo,
        pauseVideo,
        pauseAllVideos,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}
