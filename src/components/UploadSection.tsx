import { Upload, Cloud, Video, FileVideo, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const UploadSection = () => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop - will be implemented with SharePoint integration
  };

  const features = [
    { icon: Cloud, title: "סנכרון עם SharePoint", desc: "העלאה ישירה לאחסון הארגוני" },
    { icon: Video, title: "תמיכה בכל הפורמטים", desc: "MP4, MOV, AVI, WebM ועוד" },
    { icon: CheckCircle2, title: "עיבוד אוטומטי", desc: "קידוד והתאמה לסטרימינג" },
  ];

  return (
    <section id="upload" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient">העלה תוכן חדש</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              גרור ושחרר קבצי וידאו או לחץ לבחירה - הכל מסונכרן אוטומטית עם SharePoint
            </p>
          </div>

          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/10 scale-[1.02]' 
                : 'border-border hover:border-primary/50 bg-card'
              }`}
          >
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              {/* Upload Icon */}
              <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all duration-300 ${isDragging ? 'gradient-primary glow-primary scale-110' : 'bg-secondary'}`}>
                <FileVideo className={`w-10 h-10 transition-colors ${isDragging ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>

              {/* Text */}
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {isDragging ? 'שחרר כאן להעלאה' : 'גרור קבצי וידאו לכאן'}
              </h3>
              <p className="text-muted-foreground mb-6">
                או לחץ לבחירת קבצים מהמחשב
              </p>

              {/* Upload Button */}
              <Button variant="hero" size="lg">
                <Upload className="w-5 h-5" />
                בחר קבצים להעלאה
              </Button>

              {/* Supported Formats */}
              <p className="text-sm text-muted-foreground mt-4">
                פורמטים נתמכים: MP4, MOV, AVI, WebM, MKV • גודל מקסימלי: 5GB
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl gradient-card border border-border hover:border-primary/30 transition-all duration-300 text-center animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
