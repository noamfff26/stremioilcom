import { Github, Twitter, Linkedin } from "lucide-react";
import logoImg from "@/assets/logo.jpg";

export const Footer = () => {
  return (
    <footer className="py-12 bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="הענן שלי" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-bold text-foreground">הענן שלי</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              תנאי שימוש
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              פרטיות
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              עזרה
            </a>
            <a href="https://discord.gg/H4M5mufS" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              צור קשר
            </a>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 transition-all">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 transition-all">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 transition-all">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-8 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
            © 2026 הענן שלי. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
};
