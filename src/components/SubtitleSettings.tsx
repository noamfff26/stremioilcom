import { useState, useEffect } from "react";
import { X, Type, Palette, Move, Eye, Save, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SubtitleConfig {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  textOutline: boolean;
  outlineColor: string;
  outlineWidth: number;
  position: "top" | "middle" | "bottom";
  isBold: boolean;
  isRTL: boolean;
}

interface SubtitleProfile {
  id: string;
  name: string;
  config: SubtitleConfig;
  is_default: boolean;
}

interface SubtitleTrack {
  label: string;
  src: string;
  language: string;
}

interface SubtitleSettingsProps {
  config: SubtitleConfig;
  onChange: (config: SubtitleConfig) => void;
  subtitles: SubtitleTrack[];
  activeTrack: string | null;
  onTrackChange: (src: string | null) => void;
  onClose: () => void;
}

const fonts = [
  { value: "Arial", label: "Arial" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "David", label: "David (עברית)" },
  { value: "Noto Sans Hebrew", label: "Noto Sans Hebrew" },
  { value: "Heebo", label: "Heebo" },
  { value: "Assistant", label: "Assistant" },
  { value: "Rubik", label: "Rubik" },
  { value: "Open Sans", label: "Open Sans" },
];

const colors = [
  { value: "#FFFFFF", label: "לבן" },
  { value: "#FFFF00", label: "צהוב" },
  { value: "#00FF00", label: "ירוק" },
  { value: "#00FFFF", label: "תכלת" },
  { value: "#FF69B4", label: "ורוד" },
];

const backgroundColors = [
  { value: "rgba(0, 0, 0, 0.75)", label: "שחור" },
  { value: "rgba(0, 0, 0, 0.5)", label: "שחור שקוף" },
  { value: "rgba(0, 0, 0, 0)", label: "שקוף" },
  { value: "rgba(0, 0, 128, 0.75)", label: "כחול כהה" },
];

export const SubtitleSettings = ({
  config,
  onChange,
  subtitles,
  activeTrack,
  onTrackChange,
  onClose,
}: SubtitleSettingsProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"tracks" | "style" | "profiles">("tracks");
  const [profiles, setProfiles] = useState<SubtitleProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch profiles on mount
  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("subtitle_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }
    
    setProfiles(data.map(p => ({
      id: p.id,
      name: p.name,
      config: p.config as unknown as SubtitleConfig,
      is_default: p.is_default || false,
    })));
  };

  const saveProfile = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לשמור פרופילים");
      return;
    }
    
    if (!newProfileName.trim()) {
      toast.error("יש להזין שם לפרופיל");
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await supabase
      .from("subtitle_profiles")
      .insert([{
        user_id: user.id,
        name: newProfileName.trim(),
        config: JSON.parse(JSON.stringify(config)),
        is_default: false,
      }]);
    
    setIsLoading(false);
    
    if (error) {
      toast.error("שגיאה בשמירת הפרופיל");
      console.error(error);
      return;
    }
    
    toast.success("הפרופיל נשמר בהצלחה");
    setNewProfileName("");
    fetchProfiles();
  };

  const loadProfile = (profile: SubtitleProfile) => {
    onChange(profile.config);
    toast.success(`נטען פרופיל: ${profile.name}`);
  };

  const setDefaultProfile = async (profileId: string) => {
    if (!user) return;
    
    // First, unset all defaults
    await supabase
      .from("subtitle_profiles")
      .update({ is_default: false })
      .eq("user_id", user.id);
    
    // Set the new default
    await supabase
      .from("subtitle_profiles")
      .update({ is_default: true })
      .eq("id", profileId);
    
    toast.success("הפרופיל הוגדר כברירת מחדל");
    fetchProfiles();
  };

  const deleteProfile = async (profileId: string) => {
    const { error } = await supabase
      .from("subtitle_profiles")
      .delete()
      .eq("id", profileId);
    
    if (error) {
      toast.error("שגיאה במחיקת הפרופיל");
      return;
    }
    
    toast.success("הפרופיל נמחק");
    fetchProfiles();
  };

  const updateConfig = (updates: Partial<SubtitleConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div 
      className="absolute bottom-20 right-4 w-80 max-h-[60vh] overflow-y-auto rounded-xl bg-card/95 backdrop-blur border border-border shadow-2xl z-30 animate-fade-up"
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold">הגדרות כתוביות</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 p-2 text-sm font-medium transition-colors ${
            activeTab === "tracks" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("tracks")}
        >
          כתוביות
        </button>
        <button
          className={`flex-1 p-2 text-sm font-medium transition-colors ${
            activeTab === "style" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("style")}
        >
          עיצוב
        </button>
        <button
          className={`flex-1 p-2 text-sm font-medium transition-colors ${
            activeTab === "profiles" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("profiles")}
        >
          פרופילים
        </button>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "tracks" ? (
          /* Track Selection */
          <div className="space-y-2">
            <button
              className={`w-full p-3 rounded-lg text-right transition-colors ${
                !activeTrack ? "bg-primary/20 border border-primary" : "bg-secondary hover:bg-secondary/80"
              }`}
              onClick={() => onTrackChange(null)}
            >
              <span className="font-medium">ללא כתוביות</span>
            </button>
            
            {subtitles.length > 0 ? (
              subtitles.map((track) => (
                <button
                  key={track.src}
                  className={`w-full p-3 rounded-lg text-right transition-colors ${
                    activeTrack === track.src ? "bg-primary/20 border border-primary" : "bg-secondary hover:bg-secondary/80"
                  }`}
                  onClick={() => onTrackChange(track.src)}
                >
                  <span className="font-medium">{track.label}</span>
                  <span className="text-xs text-muted-foreground block">{track.language}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                אין כתוביות זמינות לסרטון זה
              </p>
            )}
          </div>
        ) : activeTab === "style" ? (
          /* Style Settings */
          <div className="space-y-5">
            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                <Label>גודל טקסט: {config.fontSize}px</Label>
              </div>
              <Slider
                value={[config.fontSize]}
                min={12}
                max={48}
                step={1}
                onValueChange={([v]) => updateConfig({ fontSize: v })}
              />
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label>גופן</Label>
              <Select
                value={config.fontFamily}
                onValueChange={(v) => updateConfig({ fontFamily: v })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <Label>צבע טקסט</Label>
              </div>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      config.textColor === color.value ? "border-primary scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => updateConfig({ textColor: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label>צבע רקע</Label>
              <Select
                value={config.backgroundColor}
                onValueChange={(v) => updateConfig({ backgroundColor: v })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {backgroundColors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text Outline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <Label>קו מתאר לטקסט</Label>
                </div>
                <Switch
                  checked={config.textOutline}
                  onCheckedChange={(v) => updateConfig({ textOutline: v })}
                />
              </div>
              
              {config.textOutline && (
                <div className="space-y-2 pr-6">
                  <Label className="text-sm">עובי קו מתאר: {config.outlineWidth}px</Label>
                  <Slider
                    value={[config.outlineWidth]}
                    min={1}
                    max={5}
                    step={0.5}
                    onValueChange={([v]) => updateConfig({ outlineWidth: v })}
                  />
                </div>
              )}
            </div>

            {/* Bold & RTL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  <Label>טקסט מודגש (Bold)</Label>
                </div>
                <Switch
                  checked={config.isBold}
                  onCheckedChange={(v) => updateConfig({ isBold: v })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  <Label>כיוון עברית (RTL)</Label>
                </div>
                <Switch
                  checked={config.isRTL}
                  onCheckedChange={(v) => updateConfig({ isRTL: v })}
                />
              </div>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-primary" />
                <Label>מיקום</Label>
              </div>
              <div className="flex gap-2">
                {[
                  { value: "top", label: "למעלה" },
                  { value: "middle", label: "אמצע" },
                  { value: "bottom", label: "למטה" },
                ].map((pos) => (
                  <button
                    key={pos.value}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      config.position === pos.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() => updateConfig({ position: pos.value as SubtitleConfig["position"] })}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 rounded-lg bg-black/80">
              <p className="text-center text-sm text-muted-foreground mb-2">תצוגה מקדימה:</p>
              <p
                className="text-center"
                dir={config.isRTL ? "rtl" : "ltr"}
                style={{
                  fontSize: `${Math.min(config.fontSize, 24)}px`,
                  fontFamily: config.fontFamily,
                  color: config.textColor,
                  backgroundColor: config.backgroundColor,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontWeight: config.isBold ? "bold" : "normal",
                  textShadow: config.textOutline
                    ? `
                      -${config.outlineWidth}px -${config.outlineWidth}px 0 ${config.outlineColor},
                      ${config.outlineWidth}px -${config.outlineWidth}px 0 ${config.outlineColor},
                      -${config.outlineWidth}px ${config.outlineWidth}px 0 ${config.outlineColor},
                      ${config.outlineWidth}px ${config.outlineWidth}px 0 ${config.outlineColor}
                    `
                    : "none",
                }}
              >
                זוהי תצוגה מקדימה של הכתוביות
              </p>
            </div>
          </div>
        ) : (
          /* Profiles Tab */
          <div className="space-y-4">
            {/* Save New Profile */}
            <div className="space-y-2">
              <Label>שמור פרופיל חדש</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="שם הפרופיל..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="bg-secondary"
                />
                <Button 
                  size="icon" 
                  onClick={saveProfile}
                  disabled={isLoading || !newProfileName.trim()}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Saved Profiles */}
            <div className="space-y-2">
              <Label>פרופילים שמורים</Label>
              {!user ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  יש להתחבר כדי לשמור ולטעון פרופילים
                </p>
              ) : profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  אין פרופילים שמורים
                </p>
              ) : (
                profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <button
                      className="flex-1 text-right"
                      onClick={() => loadProfile(profile)}
                    >
                      <span className="font-medium flex items-center gap-2">
                        {profile.name}
                        {profile.is_default && (
                          <Star className="w-3 h-3 text-primary fill-primary" />
                        )}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDefaultProfile(profile.id)}
                        title="הגדר כברירת מחדל"
                      >
                        <Star className={`w-4 h-4 ${profile.is_default ? "text-primary fill-primary" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteProfile(profile.id)}
                        title="מחק פרופיל"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
