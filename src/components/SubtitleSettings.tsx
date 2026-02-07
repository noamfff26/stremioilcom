import { useState } from "react";
import { X, Type, Palette, Move, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface SubtitleConfig {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  textOutline: boolean;
  outlineColor: string;
  outlineWidth: number;
  position: "top" | "middle" | "bottom";
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
  const [activeTab, setActiveTab] = useState<"tracks" | "style">("tracks");

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
          בחירת כתוביות
        </button>
        <button
          className={`flex-1 p-2 text-sm font-medium transition-colors ${
            activeTab === "style" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("style")}
        >
          עיצוב
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
        ) : (
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
                style={{
                  fontSize: `${Math.min(config.fontSize, 24)}px`,
                  fontFamily: config.fontFamily,
                  color: config.textColor,
                  backgroundColor: config.backgroundColor,
                  padding: "4px 8px",
                  borderRadius: "4px",
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
        )}
      </div>
    </div>
  );
};
