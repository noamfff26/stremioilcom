import { useState } from "react";
import { Calendar, Clock, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  onClose: () => void;
}

export interface FilterState {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  minDuration: number;
  maxDuration: number;
}

export const FilterPanel = ({ onFilterChange, onClose }: FilterPanelProps) => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 120]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}:${mins.toString().padStart(2, "0")} שעות` : `${hours} שעות`;
  };

  const handleApply = () => {
    onFilterChange({
      dateFrom,
      dateTo,
      minDuration: durationRange[0] * 60,
      maxDuration: durationRange[1] * 60,
    });
  };

  const handleReset = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setDurationRange([0, 120]);
    onFilterChange({
      dateFrom: undefined,
      dateTo: undefined,
      minDuration: 0,
      maxDuration: 7200,
    });
  };

  return (
    <div className="p-6 rounded-xl gradient-card border border-border animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          סינון מתקדם
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Date Range */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            טווח תאריכים
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-right font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: he }) : "מתאריך"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-right font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: he }) : "עד תאריך"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Duration Range */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            משך הסרטון
          </label>
          <div className="px-2">
            <Slider
              value={durationRange}
              onValueChange={(value) => setDurationRange(value as [number, number])}
              max={120}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{formatDuration(durationRange[0])}</span>
              <span>{formatDuration(durationRange[1])}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="hero" className="flex-1" onClick={handleApply}>
            החל סינון
          </Button>
          <Button variant="glass" onClick={handleReset}>
            איפוס
          </Button>
        </div>
      </div>
    </div>
  );
};
