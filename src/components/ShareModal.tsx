import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Copy, 
  Check, 
  Facebook, 
  Twitter, 
  MessageCircle,
  Mail,
  Link2,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoId?: string;
  currentTime?: number;
}

export const ShareModal = ({ isOpen, onClose, title, videoId, currentTime = 0 }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(false);

  const baseUrl = window.location.origin;
  const videoPath = videoId ? `/video/${videoId}` : window.location.pathname;
  const timestamp = includeTimestamp && currentTime > 0 ? `?t=${Math.floor(currentTime)}` : "";
  const shareUrl = `${baseUrl}${videoPath}${timestamp}`;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("הקישור הועתק!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("שגיאה בהעתקה");
    }
  };

  const shareToSocial = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`צפה בסרטון: ${shareUrl}`)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], "_blank", "width=600,height=400");
    }
  };

  const socialButtons = [
    { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", color: "bg-green-600 hover:bg-green-700" },
    { id: "facebook", icon: Facebook, label: "Facebook", color: "bg-blue-600 hover:bg-blue-700" },
    { id: "twitter", icon: Twitter, label: "Twitter", color: "bg-sky-500 hover:bg-sky-600" },
    { id: "telegram", icon: MessageCircle, label: "Telegram", color: "bg-blue-500 hover:bg-blue-600" },
    { id: "email", icon: Mail, label: "אימייל", color: "bg-gray-600 hover:bg-gray-700" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            שתף את הסרטון
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Title */}
          <div className="p-3 rounded-lg bg-secondary">
            <p className="text-sm text-muted-foreground">משתף:</p>
            <p className="font-medium truncate">{title}</p>
          </div>

          {/* Timestamp Option */}
          {currentTime > 0 && (
            <label className="flex items-center gap-3 p-3 rounded-lg bg-secondary cursor-pointer hover:bg-secondary/80 transition-colors">
              <input
                type="checkbox"
                checked={includeTimestamp}
                onChange={(e) => setIncludeTimestamp(e.target.checked)}
                className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
              />
              <Clock className="w-4 h-4 text-primary" />
              <span className="flex-1">התחל מ-{formatTime(currentTime)}</span>
            </label>
          )}

          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">קישור לשיתוף</label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="bg-secondary text-sm"
                dir="ltr"
              />
              <Button onClick={copyToClipboard} variant="hero">
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">שתף ברשתות חברתיות</label>
            <div className="grid grid-cols-5 gap-2">
              {socialButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => shareToSocial(btn.id)}
                  className={`p-3 rounded-lg ${btn.color} text-white transition-colors flex items-center justify-center`}
                  title={btn.label}
                >
                  <btn.icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Embed Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium">קוד להטמעה</label>
            <div className="relative">
              <Input
                value={`<iframe src="${shareUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`}
                readOnly
                className="bg-secondary text-xs font-mono"
                dir="ltr"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute left-1 top-1/2 -translate-y-1/2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `<iframe src="${shareUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`
                  );
                  toast.success("קוד ההטמעה הועתק!");
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
