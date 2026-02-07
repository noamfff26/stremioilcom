import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  X,
  Share2,
  Subtitles,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SubtitleSettings, SubtitleConfig } from "./SubtitleSettings";
import { ShareModal } from "./ShareModal";
import { toast } from "sonner";

interface SubtitleTrack {
  label: string;
  src: string;
  language: string;
}

interface VideoPlayerProps {
  src: string;
  title: string;
  thumbnail?: string;
  videoId?: string;
  subtitles?: SubtitleTrack[];
  onClose?: () => void;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const defaultSubtitleConfig: SubtitleConfig = {
  fontSize: 20,
  fontFamily: "Arial",
  textColor: "#FFFFFF",
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  textOutline: true,
  outlineColor: "#000000",
  outlineWidth: 2,
  position: "bottom",
};

export const VideoPlayer = ({ 
  src, 
  title, 
  thumbnail, 
  videoId,
  subtitles = [],
  onClose 
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subtitle state
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>(defaultSubtitleConfig);
  const [activeSubtitleTrack, setActiveSubtitleTrack] = useState<string | null>(null);
  const [parsedCues, setParsedCues] = useState<SubtitleCue[]>([]);
  const [currentCue, setCurrentCue] = useState<string>("");

  // Share state
  const [showShareModal, setShowShareModal] = useState(false);

  // Load saved subtitle config
  useEffect(() => {
    const savedConfig = localStorage.getItem("subtitle_config");
    if (savedConfig) {
      try {
        setSubtitleConfig(JSON.parse(savedConfig));
      } catch {
        // Use default
      }
    }
  }, []);

  // Save subtitle config
  const handleSubtitleConfigChange = (config: SubtitleConfig) => {
    setSubtitleConfig(config);
    localStorage.setItem("subtitle_config", JSON.stringify(config));
  };

  // Parse SRT/VTT subtitles
  const parseSubtitles = useCallback(async (url: string) => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const cues: SubtitleCue[] = [];

      // Detect format and parse
      const isVTT = text.startsWith("WEBVTT");
      const lines = text.split(/\r?\n/);
      let i = isVTT ? 1 : 0;

      while (i < lines.length) {
        const line = lines[i].trim();
        
        // Skip empty lines and cue numbers
        if (!line || /^\d+$/.test(line)) {
          i++;
          continue;
        }

        // Look for timestamp line
        const timestampMatch = line.match(
          /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
        ) || line.match(
          /(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2})[,.](\d{3})/
        );

        if (timestampMatch) {
          let start: number, end: number;
          
          if (timestampMatch.length === 9) {
            // HH:MM:SS,mmm format
            start = parseInt(timestampMatch[1]) * 3600 + parseInt(timestampMatch[2]) * 60 + 
                    parseInt(timestampMatch[3]) + parseInt(timestampMatch[4]) / 1000;
            end = parseInt(timestampMatch[5]) * 3600 + parseInt(timestampMatch[6]) * 60 + 
                  parseInt(timestampMatch[7]) + parseInt(timestampMatch[8]) / 1000;
          } else {
            // MM:SS,mmm format
            start = parseInt(timestampMatch[1]) * 60 + parseInt(timestampMatch[2]) + 
                    parseInt(timestampMatch[3]) / 1000;
            end = parseInt(timestampMatch[4]) * 60 + parseInt(timestampMatch[5]) + 
                  parseInt(timestampMatch[6]) / 1000;
          }

          // Collect text lines
          i++;
          const textLines: string[] = [];
          while (i < lines.length && lines[i].trim()) {
            textLines.push(lines[i].trim());
            i++;
          }

          if (textLines.length > 0) {
            cues.push({
              start,
              end,
              text: textLines.join("\n"),
            });
          }
        } else {
          i++;
        }
      }

      setParsedCues(cues);
    } catch (error) {
      console.error("Error parsing subtitles:", error);
      toast.error("שגיאה בטעינת הכתוביות");
    }
  }, []);

  // Load subtitles when track changes
  useEffect(() => {
    if (activeSubtitleTrack) {
      const track = subtitles.find(s => s.src === activeSubtitleTrack);
      if (track) {
        parseSubtitles(track.src);
      }
    } else {
      setParsedCues([]);
      setCurrentCue("");
    }
  }, [activeSubtitleTrack, subtitles, parseSubtitles]);

  // Update current cue based on time
  useEffect(() => {
    if (parsedCues.length === 0) {
      setCurrentCue("");
      return;
    }

    const cue = parsedCues.find(
      c => currentTime >= c.start && currentTime <= c.end
    );
    setCurrentCue(cue?.text || "");
  }, [currentTime, parsedCues]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Generate subtitle style
  const getSubtitleStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      fontSize: `${subtitleConfig.fontSize}px`,
      fontFamily: subtitleConfig.fontFamily,
      color: subtitleConfig.textColor,
      backgroundColor: subtitleConfig.backgroundColor,
      padding: "8px 16px",
      borderRadius: "4px",
      direction: "rtl",
      textAlign: "center",
      maxWidth: "80%",
      lineHeight: 1.4,
    };

    if (subtitleConfig.textOutline) {
      style.textShadow = `
        -${subtitleConfig.outlineWidth}px -${subtitleConfig.outlineWidth}px 0 ${subtitleConfig.outlineColor},
        ${subtitleConfig.outlineWidth}px -${subtitleConfig.outlineWidth}px 0 ${subtitleConfig.outlineColor},
        -${subtitleConfig.outlineWidth}px ${subtitleConfig.outlineWidth}px 0 ${subtitleConfig.outlineColor},
        ${subtitleConfig.outlineWidth}px ${subtitleConfig.outlineWidth}px 0 ${subtitleConfig.outlineColor}
      `;
    }

    return style;
  };

  const getSubtitlePositionClass = () => {
    switch (subtitleConfig.position) {
      case "top": return "top-16";
      case "middle": return "top-1/2 -translate-y-1/2";
      default: return "bottom-24";
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />

      {/* Subtitles Display */}
      {currentCue && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-10 ${getSubtitlePositionClass()}`}>
          <div style={getSubtitleStyle()} dangerouslySetInnerHTML={{ __html: currentCue.replace(/\n/g, "<br/>") }} />
        </div>
      )}

      {/* Overlay for play button when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center glow-primary hover:scale-110 transition-transform"
          >
            <Play className="w-10 h-10 text-primary-foreground fill-current ml-1" />
          </button>
        </div>
      )}

      {/* Top buttons */}
      <div className={`absolute top-4 left-4 right-4 flex justify-between z-20 transition-opacity duration-300 ${
        showControls || !isPlaying ? "opacity-100" : "opacity-0"
      }`}>
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-secondary/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {/* Share button */}
        <button
          onClick={() => setShowShareModal(true)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-secondary/70 transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Title */}
        <div className="mb-3 text-lg font-semibold text-foreground line-clamp-1" dir="rtl">
          {title}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1" dir="ltr">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between" dir="ltr">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="hover:bg-secondary/50">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => skip(-10)} className="hover:bg-secondary/50">
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => skip(10)} className="hover:bg-secondary/50">
              <SkipForward className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2 ml-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="hover:bg-secondary/50">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtitle toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSubtitleSettings(!showSubtitleSettings)}
              className={`hover:bg-secondary/50 ${activeSubtitleTrack ? "text-primary" : ""}`}
            >
              <Subtitles className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hover:bg-secondary/50">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Subtitle Settings Panel */}
      {showSubtitleSettings && (
        <SubtitleSettings
          config={subtitleConfig}
          onChange={handleSubtitleConfigChange}
          subtitles={subtitles}
          activeTrack={activeSubtitleTrack}
          onTrackChange={setActiveSubtitleTrack}
          onClose={() => setShowSubtitleSettings(false)}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={title}
        videoId={videoId}
        currentTime={currentTime}
      />
    </div>
  );
};
