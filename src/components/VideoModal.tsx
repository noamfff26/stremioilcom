import { VideoPlayer } from "./VideoPlayer";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    title: string;
    videoUrl: string;
    thumbnail: string;
  } | null;
}

export const VideoModal = ({ isOpen, onClose, video }: VideoModalProps) => {
  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full p-0 bg-transparent border-none overflow-hidden">
        <VideoPlayer
          src={video.videoUrl}
          title={video.title}
          thumbnail={video.thumbnail}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
