import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { VideoLibrary } from "@/components/VideoLibrary";
import { UploadSection } from "@/components/UploadSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Header />
      <main>
        <HeroSection />
        <VideoLibrary />
        <UploadSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
