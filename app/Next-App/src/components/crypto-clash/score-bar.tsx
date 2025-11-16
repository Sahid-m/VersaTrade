'use client';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { type Player } from '@/lib/types';

interface ScoreBarProps {
  p1: Player | null;
  p2: Player | null;
  p1Portfolio: number;
  p2Portfolio: number;
}

export function ScoreBar({ p1, p2, p1Portfolio, p2Portfolio }: ScoreBarProps) {
  const [pulse, setPulse] = useState(false);
  const [isP1Leading, setIsP1Leading] = useState(true);

  const { p1Percentage, p2Percentage } = useMemo(() => {
    const total = p1Portfolio + p2Portfolio;
    if (total === 0) return { p1Percentage: 50, p2Percentage: 50 };
    return {
      p1Percentage: (p1Portfolio / total) * 100,
      p2Percentage: (p2Portfolio / total) * 100,
    };
  }, [p1Portfolio, p2Portfolio]);
  
  useEffect(() => {
    const newIsP1Leading = p1Portfolio >= p2Portfolio;
    if (newIsP1Leading !== isP1Leading) {
      setIsP1Leading(newIsP1Leading);
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 500); // Duration of the pulse animation
      return () => clearTimeout(timer);
    }
  }, [p1Portfolio, p2Portfolio, isP1Leading]);

  return (
    <div className="flex h-3 w-full bg-secondary/50 overflow-hidden">
      <div
        className={cn(
          "h-full transition-all duration-500 ease-out",
          isP1Leading ? "bg-green-600" : "bg-red-600",
          pulse && isP1Leading && "animate-pulse-win"
        )}
        style={{ width: `${p1Percentage}%` }}
      ></div>
      <div
        className={cn(
          "h-full transition-all duration-500 ease-out",
           !isP1Leading ? "bg-green-600" : "bg-red-600",
           pulse && !isP1Leading && "animate-pulse-win"
        )}
        style={{ width: `${p2Percentage}%` }}
      ></div>
    </div>
  );
}
