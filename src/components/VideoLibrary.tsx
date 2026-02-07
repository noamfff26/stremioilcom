import { VideoCard } from "./VideoCard";
import { Search, Filter, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const mockVideos = [
  {
    id: 1,
    title: "מדריך שימוש במערכת החדשה - חלק ראשון",
    thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=340&fit=crop",
    duration: "12:45",
    views: "1.2K",
    date: "לפני 2 ימים",
    category: "הדרכה"
  },
  {
    id: 2,
    title: "סיכום ישיבת צוות שבועית",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=340&fit=crop",
    duration: "45:30",
    views: "856",
    date: "לפני 3 ימים",
    category: "ישיבות"
  },
  {
    id: 3,
    title: "הדגמת מוצר חדש ללקוחות",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop",
    duration: "08:20",
    views: "2.1K",
    date: "לפני שבוע",
    category: "מוצר"
  },
  {
    id: 4,
    title: "וובינר: טרנדים בתעשייה 2024",
    thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=340&fit=crop",
    duration: "1:02:15",
    views: "3.4K",
    date: "לפני שבוע",
    category: "וובינר"
  },
  {
    id: 5,
    title: "הכשרת עובדים חדשים - מודול 1",
    thumbnail: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=340&fit=crop",
    duration: "25:00",
    views: "945",
    date: "לפני 2 שבועות",
    category: "הדרכה"
  },
  {
    id: 6,
    title: "סקירה רבעונית Q4",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop",
    duration: "35:10",
    views: "1.8K",
    date: "לפני 2 שבועות",
    category: "דוחות"
  }
];

const categories = ["הכל", "הדרכה", "ישיבות", "מוצר", "וובינר", "דוחות"];

export const VideoLibrary = () => {
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredVideos = activeCategory === "הכל" 
    ? mockVideos 
    : mockVideos.filter(v => v.category === activeCategory);

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

            {/* Mobile Filter */}
            <Button variant="glass" size="sm" className="lg:hidden">
              <Filter className="w-4 h-4" />
              סינון
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

        {/* Video Grid */}
        <div className={`grid gap-6 ${viewMode === "grid" ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredVideos.map((video, index) => (
            <div 
              key={video.id} 
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <VideoCard {...video} />
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="glass" size="lg">
            טען עוד סרטונים
          </Button>
        </div>
      </div>
    </section>
  );
};
