import { VideoCard } from "./VideoCard";
import { Search, Filter, Grid, List, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { FilterPanel, FilterState } from "./FilterPanel";
import { VideoModal } from "./VideoModal";
import { supabase } from "@/integrations/supabase/client";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  duration_seconds: number;
  views_count: number;
  category: string;
  created_at: string;
  user_id: string;
}

const mockVideos = [
  {
    id: "mock-1",
    title: "מדריך שימוש במערכת החדשה - חלק ראשון",
    thumbnail_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=340&fit=crop",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration_seconds: 765,
    views_count: 1200,
    category: "הדרכה",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "demo"
  },
  {
    id: "mock-2",
    title: "סיכום ישיבת צוות שבועית",
    thumbnail_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=340&fit=crop",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    duration_seconds: 2730,
    views_count: 856,
    category: "ישיבות",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "demo"
  },
  {
    id: "mock-3",
    title: "הדגמת מוצר חדש ללקוחות",
    thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration_seconds: 500,
    views_count: 2100,
    category: "מוצר",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "demo"
  },
  {
    id: "mock-4",
    title: "וובינר: טרנדים בתעשייה 2024",
    thumbnail_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=340&fit=crop",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration_seconds: 3735,
    views_count: 3400,
    category: "וובינר",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "demo"
  },
  {
    id: "mock-5",
    title: "הכשרת עובדים חדשים - מודול 1",
    thumbnail_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=340&fit=crop",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    duration_seconds: 1500,
    views_count: 945,
    category: "הדרכה",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "demo"
  },
  {
    id: "mock-6",
    title: "סקירה רבעונית Q4",
    thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    duration_seconds: 2110,
    views_count: 1800,
    category: "דוחות",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "demo"
  }
];

const categories = ["הכל", "הדרכה", "ישיבות", "מוצר", "וובינר", "דוחות", "כללי"];

export const VideoLibrary = () => {
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: undefined,
    dateTo: undefined,
    minDuration: 0,
    maxDuration: 7200,
  });
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
        setVideos(mockVideos);
      } else {
        // Combine real videos with mock videos for demo
        setVideos(data.length > 0 ? data : mockVideos);
      }
    } catch (error) {
      console.error("Error:", error);
      setVideos(mockVideos);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number): string => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 14) return "לפני שבוע";
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  const filteredVideos = videos.filter((video) => {
    // Category filter
    if (activeCategory !== "הכל" && video.category !== activeCategory) return false;

    // Search filter
    if (searchQuery && !video.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Date filters
    const videoDate = new Date(video.created_at);
    if (filters.dateFrom && videoDate < filters.dateFrom) return false;
    if (filters.dateTo && videoDate > filters.dateTo) return false;

    // Duration filter
    if (video.duration_seconds < filters.minDuration) return false;
    if (video.duration_seconds > filters.maxDuration) return false;

    return true;
  });

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.minDuration > 0 || filters.maxDuration < 7200;

  return (
    <section id="library" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">ספריית הווידאו</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            כל התוכן שלך במקום אחד - מסונכרן עם SharePoint לגישה מאובטחת מכל מקום
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="חפש סרטונים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pr-12 pl-4 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Categories & View Toggle */}
          <div className="flex items-center gap-4">
            {/* Categories */}
            <div className="hidden lg:flex items-center gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === cat 
                      ? 'gradient-primary text-primary-foreground' 
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Advanced Filter Button */}
            <Button 
              variant={hasActiveFilters ? "hero" : "glass"} 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">סינון מתקדם</span>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-foreground" />}
            </Button>

            {/* Mobile Category Filter */}
            <Button variant="glass" size="sm" className="lg:hidden">
              <Calendar className="w-4 h-4" />
              קטגוריות
            </Button>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${viewMode === "grid" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${viewMode === "list" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-8">
            <FilterPanel
              onFilterChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          נמצאו {filteredVideos.length} סרטונים
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Video Grid */}
            <div className={`grid gap-6 ${viewMode === "grid" ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {filteredVideos.map((video, index) => (
                <div 
                  key={video.id} 
                  className="animate-fade-up cursor-pointer"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => setSelectedVideo(video)}
                >
                  <VideoCard 
                    title={video.title}
                    thumbnail={video.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=340&fit=crop"}
                    duration={formatDuration(video.duration_seconds)}
                    views={formatViews(video.views_count)}
                    date={formatDate(video.created_at)}
                    category={video.category}
                  />
                </div>
              ))}
            </div>

            {/* No Results */}
            {filteredVideos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">לא נמצאו סרטונים התואמים לחיפוש</p>
              </div>
            )}

            {/* Load More */}
            {filteredVideos.length > 0 && (
              <div className="text-center mt-12">
                <Button variant="glass" size="lg" onClick={fetchVideos}>
                  רענן סרטונים
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={selectedVideo ? {
          title: selectedVideo.title,
          videoUrl: selectedVideo.video_url || "",
          thumbnail: selectedVideo.thumbnail_url || "",
        } : null}
      />
    </section>
  );
};
