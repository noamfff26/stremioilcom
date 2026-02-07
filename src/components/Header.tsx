import { Play, Upload, Menu, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Play className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <span className="text-xl font-bold text-foreground">StreamHub</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              ראשי
            </a>
            <a href="#library" className="text-muted-foreground hover:text-foreground transition-colors">
              ספריה
            </a>
            <a href="#upload" className="text-muted-foreground hover:text-foreground transition-colors">
              העלאה
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="glass" size="sm">
                  <Upload className="w-4 h-4" />
                  העלה תוכן
                </Button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {user.email?.split("@")[0]}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  התנתק
                </Button>
              </>
            ) : (
              <>
                <Button variant="glass" size="sm" onClick={() => navigate("/auth")}>
                  <LogIn className="w-4 h-4" />
                  התחבר
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                  הרשמה
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                ראשי
              </a>
              <a href="#library" className="text-muted-foreground hover:text-foreground transition-colors">
                ספריה
              </a>
              <a href="#upload" className="text-muted-foreground hover:text-foreground transition-colors">
                העלאה
              </a>
              <div className="flex flex-col gap-2 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm">{user.email?.split("@")[0]}</span>
                    </div>
                    <Button variant="glass" size="sm">
                      <Upload className="w-4 h-4" />
                      העלה תוכן
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4" />
                      התנתק
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="glass" size="sm" onClick={() => navigate("/auth")}>
                      <LogIn className="w-4 h-4" />
                      התחבר
                    </Button>
                    <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                      הרשמה
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
