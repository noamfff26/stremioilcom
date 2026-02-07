import { Play, Upload, ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const HeroSection = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleUploadClick = () => {
    if (!user) {
      toast.error("יש להתחבר כדי להעלות סרטונים");
      navigate("/auth");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFolderClick = () => {
    if (!user) {
      toast.error("יש להתחבר כדי להעלות סרטונים");
      navigate("/auth");
      return;
    }
    folderInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Scroll to upload section
      const uploadSection = document.getElementById("upload");
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: "smooth" });
      }
      // Trigger file selection in the upload section
      toast.info(`נבחרו ${e.target.files.length} קבצים - גלול למטה להמשך ההעלאה`);
    }
  };

  const scrollToUpload = () => {
    const uploadSection = document.getElementById("upload");
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero pt-16">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        {...{ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>}
      />

      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">מחובר ל-SharePoint</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-up">
            <span className="text-foreground">העלה והזרם</span>
            <br />
            <span className="text-gradient">תוכן וידאו</span>
            <br />
            <span className="text-foreground">בקלות</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
            פלטפורמה מודרנית לניהול, העלאה והזרמת תוכן וידאו המשולבת עם SharePoint לאחסון וניהול קבצים מאובטח
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl" onClick={scrollToUpload}>
              <Upload className="w-5 h-5" />
              העלה וידאו חדש
            </Button>
            <Button variant="glass" size="xl" onClick={handleFolderClick}>
              <FolderOpen className="w-5 h-5" />
              העלה תיקייה
            </Button>
            <Button variant="outline" size="xl" onClick={() => document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })}>
              <Play className="w-5 h-5" />
              לספריה
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">1K+</div>
              <div className="text-sm text-muted-foreground">סרטונים</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">50+</div>
              <div className="text-sm text-muted-foreground">משתמשים</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">99%</div>
              <div className="text-sm text-muted-foreground">זמינות</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-2.5 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </section>
  );
};
