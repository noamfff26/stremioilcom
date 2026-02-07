import { VideoCard } from "./VideoCard";
import { Search, Filter, Grid, List, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FilterPanel, FilterState } from "./FilterPanel";
import { VideoModal } from "./VideoModal";

const mockVideos = [
  {
    id: 1,
    title: "מדריך שימוש במערכת החדשה - חלק ראשון",
    thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=340&fit=crop",
    duration: "12:45",
    durationSeconds: 765,
    views: "1.2K",
    date: "לפני 2 ימים",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    category: "הדרכה",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  },
  {
    id: 2,
    title: "סיכום ישיבת צוות שבועית",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=340&fit=crop",
    duration: "45:30",
    durationSeconds: 2730,
    views: "856",
    date: "לפני 3 ימים",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    category: "ישיבות",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
  },
  {
    id: 3,
    title: "הדגמת מוצר חדש ללקוחות",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop",
    duration: "08:20",
    durationSeconds: 500,
    views: "2.1K",
    date: "לפני שבוע",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    category: "מוצר",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  {
    id: 4,
    title: "וובינר: טרנדים בתעשייה 2024",
    thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=340&fit=crop",
    duration: "1:02:15",
    durationSeconds: 3735,
    views: "3.4K",
    date: "לפני שבוע",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    category: "וובינר",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  },
  {
    id: 5,
    title: "הכשרת עובדים חדשים - מודול 1",
    thumbnail: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=340&fit=crop",
    duration: "25:00",
    durationSeconds: 1500,
    views: "945",
    date: "לפני 2 שבועות",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    category: "הדרכה",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
  },
  {
    id: 6,
    title: "סקירה רבעונית Q4",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop",
    duration: "35:10",
    durationSeconds: 2110,
    views: "1.8K",
    date: "לפני 2 שבועות",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    category: "דוחות",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  }
];

const categories = ["הכל", "הדרכה", "ישיבות", "מוצר", "וובינר", "דוחות"];

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
  const [selectedVideo, setSelectedVideo] = useState<typeof mockVideos[0] | null>(null);

  const filteredVideos = mockVideos.filter((video) => {
    // Category filter
    if (activeCategory !== "הכל" && video.category !== activeCategory) return false;

    // Search filter
    if (searchQuery && !video.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Date filters
    if (filters.dateFrom && video.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && video.createdAt > filters.dateTo) return false;

    // Duration filter
    if (video.durationSeconds < filters.minDuration) return false;
    if (video.durationSeconds > filters.maxDuration) return false;

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
                thumbnail={video.thumbnail}
                duration={video.duration}
                views={video.views}
                date={video.date}
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
            <Button variant="glass" size="lg">
              טען עוד סרטונים
            </Button>
          </div>
        )}
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={selectedVideo ? {
          title: selectedVideo.title,
          videoUrl: selectedVideo.videoUrl,
          thumbnail: selectedVideo.thumbnail,
        } : null}
      />
    </section>
  );
};
