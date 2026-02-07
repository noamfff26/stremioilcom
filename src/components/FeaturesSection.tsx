import { 
  Cloud, 
  Shield, 
  Zap, 
  FolderSync, 
  Users, 
  Globe,
  Lock,
  HardDrive
} from "lucide-react";

const features = [
  {
    icon: Cloud,
    title: "אחסון בענן",
    description: "כל הקבצים שלך במקום אחד, נגישים מכל מכשיר ובכל זמן",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "אבטחה מתקדמת",
    description: "הצפנה מקצה לקצה והגנה על הפרטיות שלך",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Zap,
    title: "מהירות גבוהה",
    description: "העלאה והורדה מהירות עם תשתית מתקדמת",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: FolderSync,
    title: "סנכרון אוטומטי",
    description: "סנכרון עם SharePoint ושירותי ענן נוספים",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Users,
    title: "שיתוף קל",
    description: "שתף קבצים ותיקיות עם קולגות ולקוחות בקליק",
    color: "from-rose-500 to-red-500",
  },
  {
    icon: Lock,
    title: "בקרת הרשאות",
    description: "קבע מי יכול לצפות, לערוך או להוריד כל קובץ",
    color: "from-indigo-500 to-violet-500",
  },
];

const stats = [
  { value: "99.9%", label: "זמינות שרתים" },
  { value: "256-bit", label: "הצפנת SSL" },
  { value: "∞", label: "קבצים ותיקיות" },
  { value: "24/7", label: "תמיכה טכנית" },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">למה לבחור בענן שלי?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            פלטפורמת אחסון ענן מתקדמת המשלבת אבטחה, מהירות וקלות שימוש
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl" />
          <div className="relative glass rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="text-center animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cloud Illustration */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center justify-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <HardDrive className="w-12 h-12 text-primary animate-pulse" />
            <div className="text-right">
              <p className="text-2xl font-bold">מוכנים להתחיל?</p>
              <p className="text-muted-foreground">העלו את הקבצים הראשונים שלכם עכשיו</p>
            </div>
            <Globe className="w-10 h-10 text-primary/60" />
          </div>
        </div>
      </div>
    </section>
  );
};
