import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Mail, Lock, ArrowLeft, Loader2, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("כתובת אימייל לא תקינה");
const passwordSchema = z.string()
  .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
  .regex(/[A-Z]/, "הסיסמה חייבת להכיל אות גדולה")
  .regex(/[0-9]/, "הסיסמה חייבת להכיל מספר");

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    confirmPassword?: string;
    displayName?: string;
  }>({});

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("streamhub_remembered_email");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    if (isLogin) {
      // Simpler validation for login
      if (password.length < 6) {
        newErrors.password = "הסיסמה חייבת להכיל לפחות 6 תווים";
      }
    } else {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = "הסיסמאות לא תואמות";
      }

      if (displayName.trim().length < 2) {
        newErrors.displayName = "יש להזין שם תצוגה";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("אימייל או סיסמה שגויים");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("יש לאשר את כתובת האימייל לפני ההתחברות");
          } else {
            toast.error("שגיאה בהתחברות: " + error.message);
          }
        } else {
          // Save or remove remembered email
          if (rememberMe) {
            localStorage.setItem("streamhub_remembered_email", email);
          } else {
            localStorage.removeItem("streamhub_remembered_email");
          }
          
          toast.success("התחברת בהצלחה!");
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("כתובת האימייל כבר רשומה במערכת");
          } else {
            toast.error("שגיאה בהרשמה: " + error.message);
          }
        } else {
          toast.success("נרשמת בהצלחה! בדוק את האימייל לאישור");
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast.error("אירעה שגיאה, נסה שוב");
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return { score, label: "חלשה", color: "bg-destructive" };
    if (score <= 3) return { score, label: "בינונית", color: "bg-yellow-500" };
    return { score, label: "חזקה", color: "bg-primary" };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Play className="w-7 h-7 text-primary-foreground fill-current" />
          </div>
          <span className="text-3xl font-bold text-foreground">StreamHub</span>
        </div>

        {/* Auth Card */}
        <div className="gradient-card rounded-2xl border border-border p-8 animate-fade-up shadow-2xl">
          <h1 className="text-2xl font-bold text-center mb-2">
            {isLogin ? "ברוכים השבים!" : "יצירת חשבון חדש"}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {isLogin ? "התחבר לחשבון שלך כדי להמשיך" : "הצטרף אלינו ותתחיל להעלות תוכן"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name - only for signup */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">שם תצוגה</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="איך נקרא לך?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pr-10 bg-secondary border-border focus:border-primary transition-all"
                    disabled={isLoading}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    {errors.displayName}
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10 bg-secondary border-border focus:border-primary transition-all"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 bg-secondary border-border focus:border-primary transition-all"
                  disabled={isLoading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              
              {/* Password strength indicator - only for signup */}
              {!isLogin && password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p className="text-xs text-muted-foreground">
                      חוזק סיסמה: {passwordStrength.label}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password - only for signup */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אישור סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 bg-secondary border-border focus:border-primary transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  {confirmPassword && password === confirmPassword && (
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                  )}
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Remember me - only for login */}
            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
                    זכור אותי
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => toast.info("פונקציית שחזור סיסמה תהיה זמינה בקרוב")}
                >
                  שכחת סיסמה?
                </button>
              </div>
            )}

            <Button 
              variant="hero" 
              size="lg" 
              className="w-full mt-6" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "התחבר"
              ) : (
                "צור חשבון"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">או</span>
            </div>
          </div>

          {/* Switch mode */}
          <div className="text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setPassword("");
                setConfirmPassword("");
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              disabled={isLoading}
            >
              {isLogin ? (
                <>אין לך חשבון? <span className="text-primary font-medium">הירשם עכשיו</span></>
              ) : (
                <>יש לך חשבון? <span className="text-primary font-medium">התחבר</span></>
              )}
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            חזרה לדף הבית
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          בהרשמה אתה מסכים ל<button className="text-primary hover:underline">תנאי השימוש</button> ול<button className="text-primary hover:underline">מדיניות הפרטיות</button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
