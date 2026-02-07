import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Camera, 
  Mail, 
  Calendar, 
  Video, 
  Folder,
  Save,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
}

interface Stats {
  videosCount: number;
  foldersCount: number;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({ display_name: null, avatar_url: null });
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [stats, setStats] = useState<Stats>({ videosCount: 0, foldersCount: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
      } else {
        setDisplayName(user.email?.split("@")[0] || "");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const [videosResult, foldersResult] = await Promise.all([
        supabase.from("videos").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("folders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setStats({
        videosCount: videosResult.count || 0,
        foldersCount: foldersResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          display_name: displayName.trim() || null,
        }, { onConflict: "user_id" });

      if (error) throw error;

      setProfile(prev => ({ ...prev, display_name: displayName.trim() }));
      toast.success("הפרופיל עודכן בהצלחה");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("שגיאה בשמירת הפרופיל");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("יש להעלות קובץ תמונה בלבד");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("גודל הקובץ המקסימלי הוא 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split("/videos/")[1];
        if (oldPath) {
          await supabase.storage.from("videos").remove([oldPath]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `avatars/${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(data.path);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          avatar_url: urlData.publicUrl,
        }, { onConflict: "user_id" });

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast.success("תמונת הפרופיל עודכנה");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Page Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">
              <span className="text-gradient">הפרופיל שלי</span>
            </h1>
            <p className="text-muted-foreground">ניהול הפרטים האישיים שלך</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Avatar Card */}
            <Card className="md:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="relative group mb-4">
                  <Avatar className="w-32 h-32 border-4 border-primary/20">
                    <AvatarImage src={profile.avatar_url || undefined} alt="Profile" />
                    <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                      <Camera className="w-8 h-8 text-white" />
                    )}
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <h2 className="text-xl font-semibold">
                  {displayName || user?.email?.split("@")[0]}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>

                {/* Stats */}
                <div className="flex gap-6 mt-6 pt-6 border-t border-border w-full justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                      <Video className="w-5 h-5" />
                      {stats.videosCount}
                    </div>
                    <p className="text-xs text-muted-foreground">סרטונים</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                      <Folder className="w-5 h-5" />
                      {stats.foldersCount}
                    </div>
                    <p className="text-xs text-muted-foreground">תיקיות</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  פרטים אישיים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Name */}
                <div>
                  <label className="text-sm font-medium mb-2 block">שם תצוגה</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="הזן שם תצוגה"
                    className="bg-secondary"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    כתובת אימייל
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    לא ניתן לשנות את כתובת האימייל
                  </p>
                </div>

                {/* Member Since */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    תאריך הצטרפות
                  </label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{formatDate(user?.created_at)}</span>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  variant="hero"
                  onClick={handleSaveProfile}
                  disabled={isSaving || displayName === profile.display_name}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      שמור שינויים
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
